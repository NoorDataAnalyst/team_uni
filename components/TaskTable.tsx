"use client";

import Link from "next/link";
import Pill from "./Pill";
import StatusControl from "./StatusControl";
import { dueInfo, fmtHours, totalHours, type TaskDTO, type TaskStatus } from "@/lib/client";

type Row = TaskDTO & { project?: { id: string; name: string } };

export default function TaskTable({
  tasks,
  showProject,
  showAssignee = true,
  onStatus,
}: {
  tasks: Row[];
  showProject?: boolean;
  showAssignee?: boolean;
  onStatus?: (id: string, s: TaskStatus) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Task</th>
            {showProject && <th>Project</th>}
            {showAssignee && <th>Assigned to</th>}
            <th>Deadline</th>
            <th className="num">Est. hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const due = dueInfo(t.deadline, t.status === "COMPLETED");
            return (
              <tr key={t.id}>
                <td style={{ minWidth: 240 }}>
                  <div className="font-semibold">{t.title}</div>
                  {t.description && <div className="muted mt-0.5 text-sm">{t.description}</div>}
                </td>
                {showProject && (
                  <td>
                    {t.project ? (
                      <Link href={`/projects/${t.project.id}`} className="font-semibold" style={{ color: "var(--teal)" }}>
                        {t.project.name}
                      </Link>
                    ) : null}
                  </td>
                )}
                {showAssignee && (
                  <td style={{ whiteSpace: "nowrap" }}>
                    {t.assignee.name}
                    <div className="muted text-xs">{t.assignee.specialization}</div>
                  </td>
                )}
                <td style={{ whiteSpace: "nowrap" }}><Pill tone={due.tone}>{due.label}</Pill></td>
                <td className="num font-semibold">{fmtHours(t.estimatedHours)}</td>
                <td>
                  {onStatus ? (
                    <StatusControl value={t.status} onChange={(s) => onStatus(t.id, s)} />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="muted text-sm" colSpan={2 + (showProject ? 1 : 0) + (showAssignee ? 1 : 0) - 1}>
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </td>
            <td className="num font-semibold" colSpan={2}>{fmtHours(totalHours(tasks))} total</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
