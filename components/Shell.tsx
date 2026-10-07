"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { homeFor, type Me } from "@/lib/client";

const ROLE_LABEL = { ADMIN: "Admin", MANAGER: "Project manager", AGENT: "Agent" } as const;
const HOME_LABEL = { ADMIN: "Admin home", MANAGER: "My projects", AGENT: "My tasks" } as const;

export default function Shell({
  me,
  title,
  subtitle,
  actions,
  back,
  children,
}: {
  me: Me;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();
  const home = homeFor(me.role);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="topbar">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-5">
            <Link href={home} className="brand" style={{ textDecoration: "none" }}>
              <span className="brand-mark" aria-hidden>N</span>
              <span className="hidden sm:inline">NovaWorks Execution Desk</span>
            </Link>
            <nav className="flex gap-1" aria-label="Main">
              <Link className="navlink" href={home} aria-current={path === home ? "page" : undefined}>{HOME_LABEL[me.role]}</Link>
              <Link className="navlink" href="/team" aria-current={path === "/team" ? "page" : undefined}>Team</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <div className="font-semibold">{me.name}</div>
              <div className="muted text-xs">{ROLE_LABEL[me.role]}</div>
            </div>
            <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        {back && (
          <Link href={back.href} className="muted mb-3 inline-block text-sm" style={{ textDecoration: "none" }}>
            &larr; {back.label}
          </Link>
        )}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="muted mt-1">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
