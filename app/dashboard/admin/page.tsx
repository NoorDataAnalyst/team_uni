"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import Loading from "@/components/Loading";
import ProjectCard from "@/components/ProjectCard";
import TranscriptPreview, { type UserOption } from "@/components/TranscriptPreview";
import { api, fmtHours, type ProjectDTO } from "@/lib/client";
import { useSession } from "@/lib/useSession";
import { SAMPLE_TRANSCRIPT } from "@/lib/sample-transcript";
import type { ProjectInput } from "@/lib/validation";

interface Stats { projects: number; tasks: number; users: number; hours: number }
interface ParseResponse { projects: ProjectInput[]; model: string; managers: UserOption[]; agents: UserOption[] }

const STEPS = ["Reading the transcript", "Matching people from the team directory", "Applying final decisions and drafting tasks"];

export default function AdminPage() {
  const me = useSession("ADMIN");
  const [tab, setTab] = useState<"overview" | "create">("overview");
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [stats, setStats] = useState<Stats>({ projects: 0, tasks: 0, users: 0, hours: 0 });
  const [transcript, setTranscript] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [step, setStep] = useState(0);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetting, setResetting] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ projects: ProjectDTO[]; stats: Stats }>("/api/projects");
      setProjects(d.projects);
      setStats(d.stats);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function extract() {
    if (extracting) return; // prevents duplicate requests from repeated clicks
    setExtracting(true);
    setStep(0);
    setError("");
    setNotice("");
    setParsed(null);
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    try {
      setParsed(await api<ParseResponse>("/api/ai/parse-transcript", { method: "POST", body: JSON.stringify({ transcript }) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (timer.current) clearInterval(timer.current);
      setExtracting(false);
    }
  }

  async function reset() {
    if (!window.confirm("Delete all projects and tasks? The 10 demo users stay.")) return;
    setResetting(true);
    setError("");
    try {
      const r = await api<{ deletedProjects: number; deletedTasks: number }>("/api/admin/reset", { method: "POST" });
      setNotice(`Removed ${r.deletedProjects} projects and ${r.deletedTasks} tasks. Ready for a fresh run.`);
      setParsed(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResetting(false);
    }
  }

  if (!me) return <Loading />;

  return (
    <Shell
      me={me}
      title="Admin home"
      subtitle="Turn a meeting transcript into projects and tasks, then see every project in the company."
      actions={
        <button className="btn btn-danger" onClick={reset} disabled={resetting || extracting}>
          {resetting ? "Resetting..." : "Reset projects & tasks"}
        </button>
      }
    >
      <div className="mb-6 flex gap-1 border-b" style={{ borderColor: "var(--line)" }} role="tablist">
        <button className="tab" role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")}>All projects</button>
        <button className="tab" role="tab" aria-selected={tab === "create"} onClick={() => setTab("create")}>Create from Transcript</button>
      </div>

      {error && <div className="alert-bad mb-4" role="alert">{error}</div>}
      {notice && <div className="alert-ok mb-4" role="status">{notice}</div>}

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="tile"><div className="tile-num">{stats.projects}</div><div className="muted text-sm">Projects</div></div>
            <div className="tile"><div className="tile-num">{stats.tasks}</div><div className="muted text-sm">Tasks</div></div>
            <div className="tile"><div className="tile-num">{fmtHours(stats.hours)}</div><div className="muted text-sm">Estimated effort</div></div>
            <div className="tile"><div className="tile-num">{stats.users}</div><div className="muted text-sm">Team members</div></div>
          </div>

          {projects === null ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 130 }} />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="card py-10 text-center">
              <p className="text-lg font-semibold">No projects yet</p>
              <p className="muted mx-auto mt-1 max-w-md text-sm">Paste a meeting transcript and the AI will create the projects, tasks, owners, deadlines and estimates for you.</p>
              <button className="btn btn-primary mt-5" onClick={() => setTab("create")}>Create from Transcript</button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      )}

      {tab === "create" && (
        <div className="space-y-5">
          {!parsed && (
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <div className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="section-title" htmlFor="transcript">Meeting transcript</label>
                  <button className="btn btn-ghost" onClick={() => setTranscript(SAMPLE_TRANSCRIPT)} disabled={extracting}>Load supplied transcript</button>
                </div>
                <textarea
                  id="transcript"
                  className="textarea"
                  rows={16}
                  placeholder="Paste the meeting description or transcript here..."
                  value={transcript}
                  disabled={extracting}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="muted text-xs">{transcript.length.toLocaleString()} characters</span>
                  <button className="btn btn-primary" onClick={extract} disabled={extracting || transcript.trim().length < 40}>
                    {extracting && <span className="spinner" aria-hidden />}
                    {extracting ? "Creating..." : "Create from Transcript"}
                  </button>
                </div>
              </div>

              <aside className="card h-fit space-y-4">
                <div className="section-title">{extracting ? "AI is working" : "How it works"}</div>
                {(extracting ? STEPS : [...STEPS, "You review, fix flags, and save"]).map((s, i) => (
                  <div key={s} className="step" data-s={extracting ? (i < step ? "done" : i === step ? "active" : "") : ""}>
                    <span className="dot">{extracting && i < step ? "\u2713" : i + 1}</span>
                    {s}
                  </div>
                ))}
                {extracting && <p className="muted text-xs">Free AI models can take 10 to 30 seconds. Please keep this tab open.</p>}
              </aside>
            </div>
          )}

          {parsed && (
            <TranscriptPreview
              initial={parsed.projects}
              managers={parsed.managers}
              agents={parsed.agents}
              model={parsed.model}
              onDiscard={() => setParsed(null)}
              onSaved={async (s) => {
                setParsed(null);
                setTranscript("");
                setNotice(`Created ${s.projects} projects and ${s.tasks} tasks (${fmtHours(s.hours)} estimated).`);
                setTab("overview");
                await load();
              }}
            />
          )}
        </div>
      )}
    </Shell>
  );
}
