import { sanitizeProjects, type ProjectInput } from "./validation";

export interface DirectoryPerson {
  id: string;
  name: string;
  role: string;
  specialization: string;
  skills: string[];
}

export interface ExtractionResult {
  projects: ProjectInput[];
  model: string;
}

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

function config() {
  return {
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
  };
}

function buildSystemPrompt(directory: DirectoryPerson[]): string {
  const people = directory
    .map((p) => `- id: ${p.id} | ${p.name} | ${p.role} | ${p.specialization} | skills: ${p.skills.join(", ")}`)
    .join("\n");
  return `You convert meeting transcripts into structured project plans for NovaWorks Technologies.

Return ONLY one JSON object, with no commentary and no markdown, in exactly this shape:
{
  "projects": [
    {
      "name": "project name",
      "clientName": "client organisation",
      "description": "short scope summary, including explicit exclusions if the meeting made any",
      "managerId": "id from the directory",
      "deadline": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "task title",
          "description": "what the task covers",
          "assigneeId": "id from the directory",
          "deadline": "YYYY-MM-DD",
          "estimatedHours": 12
        }
      ]
    }
  ]
}

Rules:
1. Follow the FINAL agreed decisions. When a date, estimate, owner or deadline is corrected later in the meeting, the last confirmed value wins; ignore the earlier value.
2. Ignore rejected or out-of-scope features and anything described as future work. Do not create tasks for them. Mention important exclusions in the project description.
3. Create one project per distinct client engagement. Do not merge projects, even if the same person works on several.
4. Create exactly one task per agreed task. Use the task name stated in the meeting. Do not invent, split or merge tasks.
5. managerId and assigneeId must be copied exactly from the directory ids below. Only people in the directory can be assigned. People who are mentioned but are not in the directory (for example client contacts or end users) must never be assigned or added. If a person cannot be matched, use "" instead of guessing.
6. estimatedHours is developer effort in hours (a positive number), not the number of days between dates. Do not add management hours.
7. Dates must be YYYY-MM-DD. Use the meeting date and year given in the transcript to resolve partial dates such as "20 October".
8. If a required value is not stated, use "" (or null for estimatedHours) rather than guessing.

Directory (the only people who can be assigned):
${people}`;
}

/** Maps whatever the model wrote (an id, a full name, or just a first name) onto a real directory id. */
function resolvePerson(value: unknown, directory: DirectoryPerson[], role: "MANAGER" | "AGENT"): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const pool = directory.filter((p) => p.role === role);
  const lower = raw.toLowerCase();
  const byId = pool.find((p) => p.id.toLowerCase() === lower);
  if (byId) return byId.id;
  const byName = pool.find((p) => p.name.toLowerCase() === lower);
  if (byName) return byName.id;
  const firstNameMatches = pool.filter((p) => p.name.toLowerCase().split(" ")[0] === lower.split(" ")[0]);
  return firstNameMatches.length === 1 ? firstNameMatches[0].id : "";
}

export function normalizeExtraction(raw: unknown, directory: DirectoryPerson[]): ProjectInput[] {
  const projects = (raw as { projects?: unknown })?.projects;
  if (!Array.isArray(projects)) throw new AiError("The AI response did not contain a projects list. Try again.");
  const cleaned = sanitizeProjects(projects);
  return cleaned.map((p) => ({
    ...p,
    managerId: resolvePerson(p.managerId, directory, "MANAGER"),
    tasks: p.tasks.map((t) => ({ ...t, assigneeId: resolvePerson(t.assigneeId, directory, "AGENT") })),
  }));
}

function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AiError("The AI returned text that is not valid JSON. Try again.");
  }
}

async function callModel(transcript: string, directory: DirectoryPerson[], jsonMode: boolean): Promise<Response> {
  const { apiKey, baseUrl, model } = config();
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: buildSystemPrompt(directory) },
        { role: "user", content: `Meeting transcript:\n\n${transcript}` },
      ],
    }),
    signal: AbortSignal.timeout(55_000),
  });
}

export async function extractFromTranscript(transcript: string, directory: DirectoryPerson[]): Promise<ExtractionResult> {
  const { apiKey, model } = config();
  if (!apiKey) {
    throw new AiError("The AI provider is not configured. Set AI_API_KEY (see .env.example) and restart the server.", 503);
  }

  let res: Response;
  try {
    res = await callModel(transcript, directory, true);
    // Some providers/models reject JSON mode; retry once without it.
    if (res.status === 400) res = await callModel(transcript, directory, false);
  } catch {
    throw new AiError("Could not reach the AI provider in time. Please try again.", 504);
  }

  if (res.status === 429) throw new AiError("The free AI quota is busy right now. Wait a few seconds and try again.", 429);
  if (res.status === 401 || res.status === 403) throw new AiError("The AI provider rejected the API key. Check AI_API_KEY.", 502);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AiError(`The AI provider returned ${res.status}. ${detail.slice(0, 160)}`);
  }

  const data = await res.json();
  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new AiError("The AI provider returned an empty response. Try again.");

  return { projects: normalizeExtraction(parseJsonLoose(content), directory), model };
}
