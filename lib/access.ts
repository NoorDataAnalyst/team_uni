// Single source of truth for who may see which projects and tasks.
// Every API route uses these helpers, so the rules are enforced on the server, not just hidden in the UI.
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

/** ADMIN -> all projects. MANAGER -> projects they manage. AGENT -> projects containing their tasks. */
export function projectWhere(user: SessionUser): Prisma.ProjectWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "MANAGER") return { managerId: user.id };
  return { tasks: { some: { assigneeId: user.id } } };
}

/** Tasks the user may see inside a project. Agents only ever get their own tasks. */
export function taskWhereInProject(user: SessionUser): Prisma.TaskWhereInput {
  return user.role === "AGENT" ? { assigneeId: user.id } : {};
}

const taskSelect = {
  id: true,
  title: true,
  description: true,
  deadline: true,
  estimatedHours: true,
  status: true,
  assignee: { select: { id: true, name: true, specialization: true } },
} satisfies Prisma.TaskSelect;

const projectSelect = (user: SessionUser) =>
  ({
    id: true,
    name: true,
    clientName: true,
    description: true,
    deadline: true,
    manager: { select: { id: true, name: true, specialization: true } },
    tasks: {
      where: taskWhereInProject(user),
      orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
      select: taskSelect,
    },
  }) satisfies Prisma.ProjectSelect;

export async function listProjectsFor(user: SessionUser) {
  return prisma.project.findMany({
    where: projectWhere(user),
    orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
    select: projectSelect(user),
  });
}

/** Returns null when the project does not exist OR is outside the user's scope (same answer, no leak). */
export async function getProjectFor(user: SessionUser, id: string) {
  return prisma.project.findFirst({
    where: { id, ...projectWhere(user) },
    select: projectSelect(user),
  });
}

export function taskWhereFor(user: SessionUser): Prisma.TaskWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "MANAGER") return { project: { managerId: user.id } };
  return { assigneeId: user.id };
}
