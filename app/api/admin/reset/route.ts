import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Admin only: deletes all projects and tasks so the demo can be re-run. The 10 seeded users are kept. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const [tasks, projects] = await prisma.$transaction([prisma.task.deleteMany(), prisma.project.deleteMany()]);
  return NextResponse.json({ deletedTasks: tasks.count, deletedProjects: projects.count });
}
