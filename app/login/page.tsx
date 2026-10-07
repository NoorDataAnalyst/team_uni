"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Me } from "@/lib/client";

const DEMO_PASSWORD = "Demo123!";
const QUICK = [
  { label: "Admin", sub: "Create from transcript", email: "admin@novaworks.example" },
  { label: "Ayesha Khan", sub: "Manager, sees UrbanCart", email: "ayesha@novaworks.example" },
  { label: "Ali Raza", sub: "Agent, three tasks", email: "ali@novaworks.example" },
  { label: "Hamza Shah", sub: "Agent, two projects", email: "hamza@novaworks.example" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e: string, p: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: Me; redirect: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: e, password: p }),
      });
      router.push(data.redirect);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between px-8 py-10 text-white lg:px-14" style={{ background: "linear-gradient(160deg, var(--teal-deep), var(--teal))" }}>
        <div className="brand" style={{ color: "#fff" }}>
          <span className="brand-mark" style={{ background: "rgba(255,255,255,.18)" }} aria-hidden>N</span>
          NovaWorks Execution Desk
        </div>
        <div className="my-12 max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">Meeting notes in. Assigned work out.</h1>
          <p className="mt-4 text-base" style={{ color: "#cfe8eb" }}>
            Paste a meeting transcript and the AI creates the projects, tasks, owners, deadlines and hour estimates. Everyone then sees only the work that is theirs.
          </p>
          <ol className="mt-8 space-y-3 text-sm" style={{ color: "#cfe8eb" }}>
            <li><strong className="text-white">1.</strong> Admin pastes the transcript</li>
            <li><strong className="text-white">2.</strong> AI drafts projects and tasks</li>
            <li><strong className="text-white">3.</strong> Review, fix anything flagged, save</li>
            <li><strong className="text-white">4.</strong> Managers and agents see their own work</li>
          </ol>
        </div>
        <p className="text-sm" style={{ color: "#9fcdd3" }}>The Infinity Hack &apos;26 &middot; AI Project Manager</p>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="muted mt-1 text-sm">Use one of the supplied NovaWorks demo accounts.</p>
          <form className="mt-5 space-y-4" onSubmit={(ev) => { ev.preventDefault(); signIn(email, password); }}>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="alert-bad" role="alert">{error}</div>}
            <button className="btn btn-primary w-full" type="submit" disabled={busy}>
              {busy && <span className="spinner" aria-hidden />}
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--line)" }}>
            <h3 className="section-title">Demo quick login</h3>
            <p className="muted mb-3 text-sm">One click signs in. Password for every account: <code>{DEMO_PASSWORD}</code></p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK.map((q) => (
                <button key={q.email} className="btn btn-ghost" style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }} disabled={busy} onClick={() => signIn(q.email, DEMO_PASSWORD)}>
                  <span>{q.label}</span>
                  <span className="muted text-xs font-normal">{q.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
