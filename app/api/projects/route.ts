import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { listProjectsFor } from "@/lib/access";
import { checkProject, countIssues, sanitizeProjects } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Admin: all projects. Manager: their own. Agent: projects containing their tasks (with only their tasks). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const projects = await listProjectsFor(user);

  if (user.role === "ADMIN") {
    const [tasks, users, hours] = await Promise.all([
      prisma.task.count(),
      prisma.user.count(),
      prisma.task.aggregate({ _sum: { estimatedHours: true } }),
    ]);
    return NextResponse.json({
      projects,
      stats: { projects: projects.length, tasks, users, hours: hours._sum.estimatedHours ?? 0 },
    });
  }
  return NextResponse.json({ projects });
}

/** Admin only: validates the reviewed draft again, then saves every project and task in one all-or-nothing transaction. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const body = await req.json().catch(() => null);
  const projects = sanitizeProjects(body?.projects);
  if (projects.length === 0) {
    return NextResponse.json({ error: "There are no projects to save." }, { status: 400 });
  }

  const people = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "AGENT"] } },
    select: { id: true, role: true },
  });
  const managerIds = new Set(people.filter((p) => p.role === "MANAGER").map((p) => p.id));
  const agentIds = new Set(people.filter((p) => p.role === "AGENT").map((p) => p.id));

  const issues = projects.reduce((n, p) => n + countIssues(checkProject(p, managerIds, agentIds)), 0);
  if (issues > 0) {
    return NextResponse.json(
      { error: `${issues} field${issues === 1 ? " is" : "s are"} still invalid. Fix them and save again. Nothing was saved.` },
      { status: 400 }
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    for (const p of projects) {
      await tx.project.create({
        data: {
          name: p.name,
          clientName: p.clientName,
          description: p.description,
          managerId: p.managerId,
          deadline: p.deadline,
          tasks: {
            create: p.tasks.map((t) => ({
              title: t.title,
              description: t.description,
              assigneeId: t.assigneeId,
              deadline: t.deadline,
              estimatedHours: t.estimatedHours as number,
            })),
          },
        },
      });
    }
    return {
      projects: projects.length,
      tasks: projects.reduce((n, p) => n + p.tasks.length, 0),
      hours: projects.reduce((n, p) => n + p.tasks.reduce((h, t) => h + (t.estimatedHours as number), 0), 0),
    };
  });

  return NextResponse.json(created, { status: 201 });
}
