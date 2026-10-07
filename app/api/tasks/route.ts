import { NextResponse } from "next/server";
import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { forbidden, getCurrentUser, notFound, unauthorized } from "@/lib/auth";
import { taskWhereFor } from "@/lib/access";

export const dynamic = "force-dynamic";

const STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

/** Admin: all tasks. Manager: tasks in their projects. Agent: tasks assigned to them. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const tasks = await prisma.task.findMany({
    where: taskWhereFor(user),
    orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      deadline: true,
      estimatedHours: true,
      status: true,
      assignee: { select: { id: true, name: true, specialization: true } },
      project: { select: { id: true, name: true, clientName: true, manager: { select: { name: true } } } },
    },
  });
  return NextResponse.json({ tasks });
}

/** Update a task's status. Agents: own tasks. Managers: tasks in their projects. Admin: any. */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status as TaskStatus;
  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Send a task id and a valid status." }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true, assigneeId: true, project: { select: { managerId: true } } },
  });
  if (!task) return notFound("Task");

  const allowed =
    user.role === "ADMIN" ||
    (user.role === "MANAGER" && task.project.managerId === user.id) ||
    (user.role === "AGENT" && task.assigneeId === user.id);
  if (!allowed) return forbidden();

  await prisma.task.update({ where: { id }, data: { status } });
  return NextResponse.json({ id, status });
}
