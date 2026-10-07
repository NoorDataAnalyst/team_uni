import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Read-only team directory for any signed-in user. Never includes password hashes. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const team = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, specialization: true, skills: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ team });
}
