"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Loading from "@/components/Loading";
import Pill from "@/components/Pill";
import { api, homeFor, type TeamMember } from "@/lib/client";
import { useSession } from "@/lib/useSession";

const GROUPS = [
  { role: "ADMIN", title: "Administration" },
  { role: "MANAGER", title: "Project managers" },
  { role: "AGENT", title: "Developers" },
] as const;

export default function TeamPage() {
  const me = useSession();
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me) return;
    api<{ team: TeamMember[] }>("/api/team").then((d) => setTeam(d.team)).catch((e) => setError(e.message));
  }, [me]);

  if (!me) return <Loading />;

  return (
    <Shell me={me} title="Team directory" subtitle="The NovaWorks people the AI can assign work to." back={{ href: homeFor(me.role), label: "Back to home" }}>
      {error && <div className="alert-bad mb-4" role="alert">{error}</div>}
      {team === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
        </div>
      ) : (
        <div className="space-y-8">
          {GROUPS.map((g) => {
            const members = team.filter((m) => m.role === g.role);
            if (members.length === 0) return null;
            return (
              <section key={g.role}>
                <h2 className="eyebrow mb-3">{g.title} &middot; {members.length}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((m) => (
                    <article key={m.id} className="card space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="section-title">{m.name}</h3>
                          <div className="muted text-sm">{m.specialization}</div>
                        </div>
                        <Pill tone="info">{m.id}</Pill>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.skills.map((s) => <span key={s} className="chip">{s}</span>)}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
