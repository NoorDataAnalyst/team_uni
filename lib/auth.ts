import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const COOKIE_NAME = "nw_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is not set. Add it to your environment variables.");
  }
  return new TextEncoder().encode(secret || "dev-only-secret-change-me");
}

const cookieBase = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  // Secure cookies in production (HTTPS on Vercel); set COOKIE_SECURE=false to override for plain-HTTP testing.
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  path: "/",
});

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setSubject(userId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export function attachSession(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, { ...cookieBase(), maxAge: MAX_AGE_SECONDS });
  return res;
}

export function clearSession(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_NAME, "", { ...cookieBase(), maxAge: 0 });
  return res;
}

/** The current user always comes from the signed session cookie, never from caller-supplied fields. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch {
    return null;
  }
}

export const unauthorized = () => NextResponse.json({ error: "You are not signed in." }, { status: 401 });
export const forbidden = () =>
  NextResponse.json({ error: "Your role does not have access to this." }, { status: 403 });
export const notFound = (what = "Project") => NextResponse.json({ error: `${what} not found.` }, { status: 404 });

export const homePathFor = (role: Role) => `/dashboard/${role.toLowerCase()}`;
