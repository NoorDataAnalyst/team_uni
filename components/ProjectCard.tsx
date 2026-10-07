import Link from "next/link";
import Pill from "./Pill";
import { dueInfo, fmtHours, totalHours, type ProjectDTO } from "@/lib/client";

export default function ProjectCard({ project: p, mine }: { project: ProjectDTO; mine?: boolean }) {
  const due = dueInfo(p.deadline, false);
  return (
    <Link href={`/projects/${p.id}`} className="card card-link space-y-3" aria-label={`Open ${p.name}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="section-title">{p.name}</h3>
          <div className="muted text-sm">{p.clientName}</div>
        </div>
        <Pill tone={due.tone}>{due.label}</Pill>
      </div>
      {p.description && <p className="muted line-clamp-2 text-sm">{p.description}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm" style={{ borderColor: "var(--line)" }}>
        <span>Manager: <strong>{p.manager.name}</strong></span>
        <span className="muted">
          {p.tasks.length} {mine ? "of your " : ""}task{p.tasks.length === 1 ? "" : "s"} &middot; {fmtHours(totalHours(p.tasks))}
        </span>
      </div>
    </Link>
  );
}
