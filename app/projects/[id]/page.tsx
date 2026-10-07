"use client";

import { use, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Loading from "@/components/Loading";
import Pill from "@/components/Pill";
import TaskTable from "@/components/TaskTable";
import { api, dueInfo, fmtDate, fmtHours, homeFor, totalHours, type ProjectDTO, type TaskStatus } from "@/lib/client";
import { useSession } from "@/lib/useSession";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const me = useSession();
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setProject((await api<{ project: ProjectDTO }>(`/api/projects/${id}`)).project);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function setStatus(taskId: string, status: TaskStatus) {
    const before = project;
    setError("");
    setProject((p) => (p ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) } : p));
    try {
      await api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id: taskId, status }) });
    } catch (e) {
      setProject(before);
      setError((e as Error).message);
    }
  }

  if (!me) return <Loading />;
  const back = { href: homeFor(me.role), label: "Back to home" };

  if (!project) {
    return (
      <Shell me={me} title={error ? "Project unavailable" : "Loading project..."} back={back}>
        {error ? (
          <div className="card text-center">
            <p className="font-semibold">{error}</p>
            <p className="muted mt-1 text-sm">It may not exist, or it is not part of your work.</p>
          </div>
        ) : (
          <div className="skeleton" style={{ height: 220 }} />
        )}
      </Shell>
    );
  }

  const due = dueInfo(project.deadline, false);
  const isAgent = me.role === "AGENT";

  return (
    <Shell me={me} title={project.name} subtitle={`Client: ${project.clientName}`} back={back}>
      {error && <div className="alert-bad mb-4" role="alert">{error}</div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="tile"><div className="eyebrow">Manager</div><div className="mt-1 font-semibold">{project.manager.name}</div><div className="muted text-xs">{project.manager.specialization}</div></div>
        <div className="tile"><div className="eyebrow">Project deadline</div><div className="mt-1 font-semibold">{fmtDate(project.deadline)}</div><div className="mt-1"><Pill tone={due.tone}>{due.label}</Pill></div></div>
        <div className="tile"><div className="eyebrow">{isAgent ? "Your tasks" : "Tasks"}</div><div className="tile-num mt-1">{project.tasks.length}</div></div>
        <div className="tile"><div className="eyebrow">{isAgent ? "Your estimated hours" : "Estimated hours"}</div><div className="tile-num mt-1">{fmtHours(totalHours(project.tasks))}</div></div>
      </div>

      {project.description && (
        <div className="card mb-6">
          <div className="eyebrow mb-1">Scope</div>
          <p>{project.description}</p>
        </div>
      )}

      <h2 className="section-title mb-3">{isAgent ? "Your tasks in this project" : "Tasks"}</h2>
      <TaskTable tasks={project.tasks} onStatus={setStatus} />
      {isAgent && <p className="muted mt-3 text-sm">You only see tasks assigned to you. Other people&apos;s tasks in this project are not shown.</p>}
    </Shell>
  );
}
