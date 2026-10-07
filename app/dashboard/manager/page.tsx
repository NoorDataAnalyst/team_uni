"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Loading from "@/components/Loading";
import ProjectCard from "@/components/ProjectCard";
import { api, type ProjectDTO } from "@/lib/client";
import { useSession } from "@/lib/useSession";

export default function ManagerPage() {
  const me = useSession("MANAGER");
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me) return;
    api<{ projects: ProjectDTO[] }>("/api/projects").then((d) => setProjects(d.projects)).catch((e) => setError(e.message));
  }, [me]);

  if (!me) return <Loading />;

  return (
    <Shell me={me} title="My projects" subtitle="Projects you manage, with their tasks, owners, deadlines and estimates.">
      {error && <div className="alert-bad mb-4" role="alert">{error}</div>}
      {projects === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 130 }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-lg font-semibold">No projects assigned to you yet</p>
          <p className="muted mt-1 text-sm">Projects appear here once the admin creates them from a meeting transcript.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </Shell>
  );
}
