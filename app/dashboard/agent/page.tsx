"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Loading from "@/components/Loading";
import TaskTable from "@/components/TaskTable";
import { api, fmtHours, totalHours, type MyTaskDTO, type TaskStatus } from "@/lib/client";
import { useSession } from "@/lib/useSession";

type Filter = "open" | "done" | "all";

export default function AgentPage() {
  const me = useSession("AGENT");
  const [tasks, setTasks] = useState<MyTaskDTO[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setTasks((await api<{ tasks: MyTaskDTO[] }>("/api/tasks")).tasks);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function setStatus(id: string, status: TaskStatus) {
    const before = tasks;
    setError("");
    setTasks((ts) => ts?.map((t) => (t.id === id ? { ...t, status } : t)) ?? ts);
    try {
      await api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id, status }) });
    } catch (e) {
      setTasks(before);
      setError((e as Error).message);
    }
  }

  if (!me) return <Loading />;

  const all = tasks ?? [];
  const open = all.filter((t) => t.status !== "COMPLETED").length;
  const projectCount = new Set(all.map((t) => t.project.id)).size;
  const visible = all.filter((t) => (filter === "all" ? true : filter === "done" ? t.status === "COMPLETED" : t.status !== "COMPLETED"));

  return (
    <Shell
      me={me}
      title="My tasks"
      subtitle={tasks ? `${all.length} assigned across ${projectCount} project${projectCount === 1 ? "" : "s"}, ${fmtHours(totalHours(all))} estimated, ${open} still open.` : "Loading your assignments..."}
    >
      {error && <div className="alert-bad mb-4" role="alert">{error}</div>}

      <div className="mb-4 flex gap-2" role="group" aria-label="Filter tasks">
        {(["all", "open", "done"] as Filter[]).map((f) => (
          <button key={f} className={`btn ${filter === f ? "btn-primary" : "btn-ghost"}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "open" ? "Open" : f === "done" ? "Done" : "All"}
          </button>
        ))}
      </div>

      {tasks === null ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : visible.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-lg font-semibold">{all.length === 0 ? "Nothing assigned to you yet" : "No tasks in this view"}</p>
          <p className="muted mt-1 text-sm">{all.length === 0 ? "Tasks appear here when the admin creates projects from a meeting." : "Switch the filter to see other tasks."}</p>
        </div>
      ) : (
        <TaskTable tasks={visible} showProject showAssignee={false} onStatus={setStatus} />
      )}
    </Shell>
  );
}
