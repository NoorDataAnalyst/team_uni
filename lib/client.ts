// Types and helpers used by client components.

export type Role = "ADMIN" | "MANAGER" | "AGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface Me {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface PersonRef {
  id: string;
  name: string;
  specialization: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string;
  deadline: string;
  estimatedHours: number;
  status: TaskStatus;
  assignee: PersonRef;
}

export interface ProjectDTO {
  id: string;
  name: string;
  clientName: string;
  description: string;
  deadline: string;
  manager: PersonRef;
  tasks: TaskDTO[];
}

/** Row returned by GET /api/tasks (adds the parent project). */
export interface MyTaskDTO extends TaskDTO {
  project: { id: string; name: string; clientName: string; manager: { name: string } };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialization: string;
  skills: string[];
}

export const homeFor = (role: Role) => `/dashboard/${role.toLowerCase()}`;

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const totalHours = (tasks: { estimatedHours: number }[]) => tasks.reduce((n, t) => n + t.estimatedHours, 0);
export const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}h`;

export function fmtDate(deadline: string) {
  const [y, m, d] = deadline.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dueInfo(deadline: string, done: boolean) {
  const [y, m, d] = deadline.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const pretty = fmtDate(deadline);
  if (done) return { label: `Done, was due ${pretty}`, tone: "ok" as const };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Overdue ${-diff}d, ${pretty}`, tone: "bad" as const };
  if (diff === 0) return { label: `Due today`, tone: "warn" as const };
  if (diff <= 3) return { label: `Due in ${diff}d, ${pretty}`, tone: "warn" as const };
  return { label: `Due ${pretty}`, tone: "muted" as const };
}

export const TASK_LABEL: Record<TaskStatus, string> = {
  PENDING: "To do",
  IN_PROGRESS: "In progress",
  COMPLETED: "Done",
};
