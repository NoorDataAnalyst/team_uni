# NovaWorks Execution Desk

**The Infinity Hack '26 · AI Project Manager: Meeting to Execution**

A small project-management CRM for NovaWorks Technologies. The admin pastes a meeting transcript, an AI model turns it into projects and tasks (owners, deadlines, estimated hours), the admin reviews and saves, and every user then sees only the work that is theirs.

- **Live app:** `<add your Vercel URL here>`
- **Demo video:** `<add your video link here>`
- **Team:** `<add team name and members>`

## Features

| Area | What you get |
| --- | --- |
| Login | Email + password with the supplied demo accounts, signed HTTP-only session cookie, logout |
| Admin home | All project cards, totals, **Create from Transcript** |
| AI conversion | Transcript + team directory go to an LLM. It follows final decisions, ignores rejected features, never invents people |
| Review screen | Every field is validated. Bad or unknown people/dates/hours turn red with a dropdown to fix them. **Nothing is saved until all checks pass** |
| Safe save | All projects and tasks are written in **one database transaction** (all or nothing). Buttons lock while working, so no duplicates |
| Projects | Cards and a project detail page: client, manager, deadline, scope, task table (owner, deadline, estimated hours) |
| Role-based access | Admin sees everything. Managers see only their projects. Agents see only their own tasks and the related project. Enforced **in the API**, not just hidden in the UI |
| Team directory | Read-only names, specializations and skills |
| Extras | Task status toggle, loading skeletons, empty states, responsive layout, one-click demo logins, "Reset projects & tasks" for re-running the demo |

Not included, by design: signup, password reset, user management, cost calculation, progress dashboards.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Prisma · PostgreSQL · `jose` + `bcryptjs` for sessions · any OpenAI-compatible LLM API (Groq or Google Gemini free tier).

## Run it locally

You need Node.js 20+ and a PostgreSQL database. A free hosted one (Neon or Aiven, see below) is the easiest, and you use the same one locally and in production.

```bash
npm install
cp .env.example .env        # then fill in the values below
npx prisma db push          # creates the tables
npx prisma db seed          # inserts the 10 demo users (safe to re-run, never duplicates)
npm run dev                 # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (keep `?sslmode=require` for hosted databases) |
| `AUTH_SECRET` | Long random string that signs sessions (`openssl rand -base64 32`) |
| `AI_API_KEY` | Key for your AI provider |
| `AI_BASE_URL` | OpenAI-compatible base URL. Default: Groq `https://api.groq.com/openai/v1` |
| `AI_MODEL` | Model name. Default: `llama-3.3-70b-versatile` |

`.env.example` has the placeholders. Never commit your real `.env`.

**Free AI keys:** [Groq](https://console.groq.com/keys) or [Google AI Studio (Gemini)](https://aistudio.google.com/apikey). For Gemini set `AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai` and a current Gemini Flash model name. Free-tier model names and limits change, so check the provider's model list if you get a "model not found" error.

## Demo accounts

Password for **every** account: `Demo123!`

| ID | Name | Email | Role |
| --- | --- | --- | --- |
| ADMIN | Admin | admin@novaworks.example | Administrator |
| PM01 | Ayesha Khan | ayesha@novaworks.example | Manager (Web) |
| PM02 | Bilal Ahmed | bilal@novaworks.example | Manager (Mobile) |
| PM03 | Hina Malik | hina@novaworks.example | Manager (AI) |
| DEV01 | Ali Raza | ali@novaworks.example | Agent (Full-Stack) |
| DEV02 | Hamza Shah | hamza@novaworks.example | Agent (Full-Stack) |
| DEV03 | Sara Noor | sara@novaworks.example | Agent (App) |
| DEV04 | Usman Tariq | usman@novaworks.example | Agent (App) |
| DEV05 | Zain Abbas | zain@novaworks.example | Agent (AI) |
| DEV06 | Maryam Asif | maryam@novaworks.example | Agent (AI) |

## Testing the transcript flow

1. Sign in as **admin@novaworks.example**.
2. Open **Create from Transcript** and click **Load supplied transcript** (or paste your own), then **Create from Transcript**.
3. Review the draft. Expect **3 projects and 12 tasks** (UrbanCart 40h, QuickServe 46h, HelpDeskPro 38h). Try blanking a person to see the red state and blocked Save.
4. Click **Save projects & tasks**. Open a project to see client, manager, deadline and task table.
5. Sign in as **Ayesha** (only UrbanCart), **Ali** (his 3 tasks), **Hamza** (2 tasks across 2 projects). Refresh: data persists.
6. Prove it is real AI: edit the transcript (e.g. QuickServe integration becomes 12 hours, due 23 October), convert again, and only that task changes. Use **Reset projects & tasks** first to avoid duplicates.

## Deploy for free (Vercel + Neon/Aiven + Groq/Gemini)

Everything below has a free tier. Plans and limits change, so double-check each provider's current terms.

1. **Database.** Create a free PostgreSQL database at [Neon](https://neon.tech) or [Aiven](https://aiven.io/free-postgresql-database). Copy the connection string. If Neon offers a "pooled" and a "direct" string, use the **direct** one for step 3.
2. **Push the code** to GitHub with this project at the repo root (so `README.md` sits at the top).
3. **Create tables and users, once, from your computer:**
   ```bash
   # put the hosted DATABASE_URL in .env, then:
   npm install
   npx prisma db push
   npx prisma db seed
   ```
4. **AI key.** Create a free Groq or Gemini key (links above).
5. **Vercel.** Import the GitHub repo at [vercel.com](https://vercel.com) (Hobby plan). Framework is detected as Next.js. Add environment variables `DATABASE_URL`, `AUTH_SECRET`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`. Click **Deploy**. The build script already runs `prisma generate`.
6. **Smoke test** the live URL: log in as admin, load the supplied transcript, create, then log in as Ayesha and Ali.
7. Paste the live URL and demo video link at the top of this README.

**Before judging:** open the live site once a few minutes earlier. Free databases and serverless functions can be slow on the first request after idling.

## How access control works

All rules live in `lib/access.ts` and every API route uses them:

- Projects: Admin all · Manager `managerId == me` · Agent only projects containing their tasks.
- Tasks inside a project: Admin all · Manager all in their projects · Agent **only their own**.
- A direct request to `/api/projects/<id>` for an out-of-scope project returns 404, same as a missing one.
- Transcript parsing, saving and reset are Admin only. The user always comes from the signed session cookie, never from a request field.
- The AI receives only user `id`, name, role, specialization and skills. No emails, no passwords.

## Project layout

```
app/api/…            REST endpoints (auth, projects, tasks, team, ai/parse-transcript, admin/reset)
app/dashboard/…      admin, manager and agent home screens
app/projects/[id]    project detail     app/team   team directory
components/          Shell, ProjectCard, TaskTable, TranscriptPreview, …
lib/ai.ts            prompt, provider call, output normalisation
lib/validation.ts    shared validation (browser review screen + server save)
lib/access.ts        role-based query scoping
prisma/              schema.prisma + seed.ts
```

## Known limitations

- Extraction quality depends on the AI model. The review screen exists so a human confirms before anything is saved.
- Free AI tiers are rate limited. If you see a "busy" message, wait a few seconds and retry.
- Demo-grade auth: no rate limiting, signup, or password reset (not required by the challenge).
- Editing created projects/tasks is not implemented (optional in the brief). Only task status can be changed.
