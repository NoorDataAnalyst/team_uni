"use client";

import { useMemo, useState } from "react";
import { api, fmtHours } from "@/lib/client";
import { checkProject, countIssues, type ProjectInput, type TaskInput } from "@/lib/validation";
import Pill from "./Pill";

export interface UserOption {
  id: string;
  name: string;
}

function Field({ label, bad, hint, children }: { label: string; bad?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {bad && <div className="hint-bad">{hint || "Needs a valid value"}</div>}
    </div>
  );
}

export default function TranscriptPreview({
  initial,
  managers,
  agents,
  model,
  onSaved,
  onDiscard,
}: {
  initial: ProjectInput[];
  managers: UserOption[];
  agents: UserOption[];
  model: string;
  onSaved: (summary: { projects: number; tasks: number; hours: number }) => void;
  onDiscard: () => void;
}) {
  const [projects, setProjects] = useState<ProjectInput[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const managerSet = useMemo(() => new Set(managers.map((m) => m.id)), [managers]);
  const agentSet = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);
  const flags = useMemo(() => projects.map((p) => checkProject(p, managerSet, agentSet)), [projects, managerSet, agentSet]);
  const issues = flags.reduce((n, f) => n + countIssues(f), 0);
  const taskTotal = projects.reduce((n, p) => n + p.tasks.length, 0);
  const hourTotal = projects.reduce((n, p) => n + p.tasks.reduce((h, t) => h + (t.estimatedHours ?? 0), 0), 0);

  const patchProject = (i: number, patch: Partial<ProjectInput>) =>
    setProjects((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const patchTask = (i: number, j: number, patch: Partial<TaskInput>) =>
    setProjects((ps) =>
      ps.map((p, idx) => (idx === i ? { ...p, tasks: p.tasks.map((t, k) => (k === j ? { ...t, ...patch } : t)) } : p))
    );

  async function save() {
    if (saving) return; // blocks accidental double clicks
    setSaving(true);
    setError("");
    try {
      onSaved(await api<{ projects: number; tasks: number; hours: number }>("/api/projects", { method: "POST", body: JSON.stringify({ projects }) }));
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const aiSaid = (value: string) => `AI returned ${value ? `"${value}"` : "nothing"}, which is not a valid team member. Pick a person.`;

  return (
    <div className="space-y-5">
      <div className="card sticky top-[64px] z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="section-title">Review before saving</div>
          <div className="muted text-sm">
            {projects.length} project{projects.length === 1 ? "" : "s"}, {taskTotal} tasks, {fmtHours(hourTotal)} estimated. Extracted by {model}.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {issues > 0 ? <Pill tone="bad">{issues} to fix</Pill> : <Pill tone="ok">All checks passed</Pill>}
          <button className="btn btn-ghost" onClick={onDiscard} disabled={saving}>Discard</button>
          <button className="btn btn-primary" onClick={save} disabled={issues > 0 || saving || projects.length === 0}>
            {saving && <span className="spinner" aria-hidden />}
            {saving ? "Saving..." : "Save projects & tasks"}
          </button>
        </div>
      </div>

      {issues > 0 && (
        <div className="alert-bad" role="alert">
          Nothing is saved until every red field is fixed. Choose the right person from the dropdown or correct the value.
        </div>
      )}
      {error && <div className="alert-bad" role="alert">{error}</div>}

      {projects.map((p, i) => {
        const f = flags[i];
        return (
          <section key={i} className="card space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Project" bad={f.name} hint="Name is required">
                <input className={`input ${f.name ? "is-bad" : ""}`} value={p.name} onChange={(e) => patchProject(i, { name: e.target.value })} />
              </Field>
              <Field label="Client" bad={f.clientName} hint="Client is required">
                <input className={`input ${f.clientName ? "is-bad" : ""}`} value={p.clientName} onChange={(e) => patchProject(i, { clientName: e.target.value })} />
              </Field>
              <Field label="Manager" bad={f.manager} hint={aiSaid(initial[i]?.managerId ?? "")}>
                <select className={`select ${f.manager ? "is-bad" : ""}`} value={f.manager ? "" : p.managerId} onChange={(e) => patchProject(i, { managerId: e.target.value })}>
                  <option value="">Select a manager</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Project deadline" bad={f.deadline} hint="Use a real date">
                <input type="date" className={`input ${f.deadline ? "is-bad" : ""}`} value={p.deadline} onChange={(e) => patchProject(i, { deadline: e.target.value })} />
              </Field>
            </div>
            <Field label="Description">
              <textarea rows={2} className="textarea" value={p.description} onChange={(e) => patchProject(i, { description: e.target.value })} />
            </Field>

            {f.noTasks && <div className="alert-bad">This project has no tasks.</div>}

            <div className="space-y-3">
              {p.tasks.map((t, j) => {
                const tf = f.tasks[j];
                const anyBad = Object.values(tf).some(Boolean);
                return (
                  <div key={j} className="rounded-lg border p-3" style={{ borderColor: anyBad ? "var(--bad)" : "var(--line)" }}>
                    <div className="grid gap-3 md:grid-cols-[2fr_1.5fr_1fr_.7fr]">
                      <Field label="Task" bad={tf.title} hint="Title is required">
                        <input className={`input ${tf.title ? "is-bad" : ""}`} value={t.title} onChange={(e) => patchTask(i, j, { title: e.target.value })} />
                      </Field>
                      <Field label="Assigned agent" bad={tf.assignee} hint={aiSaid(initial[i]?.tasks[j]?.assigneeId ?? "")}>
                        <select className={`select ${tf.assignee ? "is-bad" : ""}`} value={tf.assignee ? "" : t.assigneeId} onChange={(e) => patchTask(i, j, { assigneeId: e.target.value })}>
                          <option value="">Select an agent</option>
                          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </Field>
                      <Field
                        label="Task deadline"
                        bad={tf.deadline || tf.deadlineAfterProject}
                        hint={tf.deadlineAfterProject ? "Must not be after the project deadline" : "Use a real date"}
                      >
                        <input type="date" className={`input ${tf.deadline || tf.deadlineAfterProject ? "is-bad" : ""}`} value={t.deadline} onChange={(e) => patchTask(i, j, { deadline: e.target.value })} />
                      </Field>
                      <Field label="Est. hours" bad={tf.hours} hint="Must be above 0">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          className={`input ${tf.hours ? "is-bad" : ""}`}
                          value={t.estimatedHours ?? ""}
                          onChange={(e) => patchTask(i, j, { estimatedHours: e.target.value === "" ? null : Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                    <div className="mt-3">
                      <Field label="Description">
                        <textarea rows={2} className="textarea" value={t.description} onChange={(e) => patchTask(i, j, { description: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
