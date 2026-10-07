import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { AiError, extractFromTranscript } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const body = await req.json().catch(() => null);
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (transcript.length < 40) {
    return NextResponse.json({ error: "Paste a meeting transcript first." }, { status: 400 });
  }
  if (transcript.length > 40_000) {
    return NextResponse.json({ error: "The transcript is too long. Keep it under 40,000 characters." }, { status: 400 });
  }

  // The AI only ever sees id, name, role, specialization and skills. Never emails or passwords.
  const people = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "AGENT"] } },
    select: { id: true, name: true, role: true, specialization: true, skills: true },
    orderBy: { id: "asc" },
  });

  try {
    const result = await extractFromTranscript(transcript, people);
    return NextResponse.json({
      ...result,
      managers: people.filter((p) => p.role === "MANAGER").map(({ id, name }) => ({ id, name })),
      agents: people.filter((p) => p.role === "AGENT").map(({ id, name }) => ({ id, name })),
    });
  } catch (e) {
    const status = e instanceof AiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status });
  }
}
