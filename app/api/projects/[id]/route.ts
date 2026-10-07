import { NextResponse } from "next/server";
import { getCurrentUser, notFound, unauthorized } from "@/lib/auth";
import { getProjectFor } from "@/lib/access";

export const dynamic = "force-dynamic";

/** Direct requests get the same scoping as the lists: out-of-scope projects look like they do not exist. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const project = await getProjectFor(user, id);
  if (!project) return notFound();
  return NextResponse.json({ project });
}
