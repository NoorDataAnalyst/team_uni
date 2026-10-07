// Pure helpers shared by the browser (review screen) and the server (save endpoint).

export interface TaskInput {
  title: string;
  description: string;
  assigneeId: string;
  deadline: string;
  estimatedHours: number | null;
}

export interface ProjectInput {
  name: string;
  clientName: string;
  description: string;
  managerId: string;
  deadline: string;
  tasks: TaskInput[];
}

/** true = the field is invalid */
export interface ProjectFlags {
  name: boolean;
  clientName: boolean;
  manager: boolean;
  deadline: boolean;
  noTasks: boolean;
  tasks: { title: boolean; assignee: boolean; deadline: boolean; deadlineAfterProject: boolean; hours: boolean }[];
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const blank = (s: string) => !s || s.trim().length === 0;
const validHours = (h: number | null) => typeof h === "number" && Number.isFinite(h) && h > 0 && h <= 1000;

export function checkProject(p: ProjectInput, managerIds: Set<string>, agentIds: Set<string>): ProjectFlags {
  const projectDateOk = isIsoDate(p.deadline);
  return {
    name: blank(p.name),
    clientName: blank(p.clientName),
    manager: !managerIds.has(p.managerId),
    deadline: !projectDateOk,
    noTasks: p.tasks.length === 0,
    tasks: p.tasks.map((t) => {
      const dateOk = isIsoDate(t.deadline);
      return {
        title: blank(t.title),
        assignee: !agentIds.has(t.assigneeId),
        deadline: !dateOk,
        // A task may not finish after the project it belongs to.
        deadlineAfterProject: dateOk && projectDateOk && t.deadline > p.deadline,
        hours: !validHours(t.estimatedHours),
      };
    }),
  };
}

export function countIssues(f: ProjectFlags): number {
  let n = [f.name, f.clientName, f.manager, f.deadline, f.noTasks].filter(Boolean).length;
  for (const t of f.tasks) n += Object.values(t).filter(Boolean).length;
  return n;
}

/** Trims and type-coerces untrusted input into the strict ProjectInput shape. */
export function sanitizeProjects(raw: unknown): ProjectInput[] {
  if (!Array.isArray(raw)) return [];
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
  return raw.map((p) => {
    const proj = (p ?? {}) as Record<string, unknown>;
    const tasks = Array.isArray(proj.tasks) ? proj.tasks : [];
    return {
      name: s(proj.name),
      clientName: s(proj.clientName),
      description: s(proj.description),
      managerId: s(proj.managerId),
      deadline: s(proj.deadline),
      tasks: tasks.map((t) => {
        const task = (t ?? {}) as Record<string, unknown>;
        const hours = task.estimatedHours === "" || task.estimatedHours == null ? null : Number(task.estimatedHours);
        return {
          title: s(task.title),
          description: s(task.description),
          assigneeId: s(task.assigneeId),
          deadline: s(task.deadline),
          estimatedHours: hours !== null && Number.isFinite(hours) ? hours : null,
        };
      }),
    };
  });
}
