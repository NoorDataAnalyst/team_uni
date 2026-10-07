import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { attachSession, createToken, homePathFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    redirect: homePathFor(user.role),
  });
  return attachSession(res, await createToken(user.id));
}
