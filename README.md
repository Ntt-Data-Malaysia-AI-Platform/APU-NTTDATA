# APU GenAI Assistant

A working first slice of the [APU GenAI Solution Draft](https://claude.ai/code/artifact/ae5cd312-7e28-481b-9172-62d802b8ad3d), delivered by NTT DATA. It runs on Cloud Run and calls Claude on Vertex AI.

- **Sign-in screen:** every page and API requires a login. The built-in demo login is set in `server/config.ts`; override it with `APP_USERNAME` / `APP_PASSWORD`.
- **Landing page:** introduces the platform; you choose one of five personas.
- **Persona workspace:** a live dashboard (KPIs, timeline, attendance, grants, tickets…) plus four **one-click AI tools** per persona, such as a quiz generator, study planner, email drafter or proposal outline. Click any dashboard item marked *Ask AI* to get help with it.
- **Docked assistant:** a chat panel on the right (a drawer on phones) grounded in APU documents, with sources. Switch persona from the dropdown at the top right.

| Persona | Assistant | What it can do |
| --- | --- | --- |
| Prospective student | APU Admissions Assistant | Programmes, entry requirements, intakes, scholarships, visas |
| Current student | APU Student Assistant | Plus the student's own fees, timetable, results and attendance |
| Lecturer | APU Teaching Assistant | Their modules and deadlines, quizzes, rubrics, feedback drafts, GenAI policy |
| Admin staff | APU Staff Assistant | HR, finance and IT policies, drafting, logging service tickets |
| Researcher | APU Research Assistant | Funding calls, grants, ethics, proposal structure |

Switching persona starts a new conversation and changes the assistant's role, its tools and **which documents it may read**. For example, a student can't retrieve HR policies.

## How it works

```
Browser  (public/js: landing, workspace, AI tools, docked chat)
   │  GET  /api/dashboard/:persona   dashboard widgets
   │  POST /api/tickets              direct ticket logging (staff)
   │  POST /api/chat                 streamed answer (server-sent events)
   ▼
Cloud Run: Node.js / Express  (server/)
   ├─ personas.ts   role prompt, allowed tools, allowed document audiences
   ├─ dashboard.ts  per-persona KPIs and widgets
   ├─ demo-data.ts  sample records (swap for SIS, LMS, ITSM, HR, research APIs)
   ├─ knowledge.ts  BM25 search over knowledge/*.md, filtered by audience
   ├─ tools.ts      search_apu_knowledge + persona tools
   └─ llm.ts        Claude tool-use loop, streaming, refusal fallback
   ▼
Claude Opus 5.5 on Vertex AI (auth: Cloud Run service account, no API keys)
```

- Answers are grounded in the knowledge base and cite sources as [1], [2]. Click a citation to open the source.
- Personal data comes only from persona tools, never from the model's memory.
- Every persona gets the same guardrails: answer from sources, reply in the user's language (English, Malay or Chinese), escalate distress to counselling, and never write graded work for students.
- If Claude declines a request, the SDK retries it on a fallback model (`CLAUDE_FALLBACK_MODEL`), because Vertex AI has no server-side fallback.

> **Everything in `knowledge/` and the personal records in `server/tools.ts` is sample data.** Replace it with APU's official documents and real system integrations before any real use.

## Run locally

Requires Node.js 20 or later.

```bash
npm install
```

**Demo mode** (no Google Cloud needed): the assistant shows what it retrieved instead of calling a model.

```bash
npm run dev
```

Then open http://localhost:8080.

**With Claude on Vertex AI:**

```bash
gcloud auth application-default login
```

```powershell
$env:ANTHROPIC_VERTEX_PROJECT_ID = "your-project-id"; npm run dev
```

## Deploy to Cloud Run

One-time prerequisites:

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), then run `gcloud auth login`.
2. Use a project with billing enabled.
3. Enable **Claude Opus 5.5** in [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/model-garden) for that project and accept the terms.

Deploy (Windows PowerShell):

```powershell
./deploy.ps1 -ProjectId your-project-id
```

Or from bash:

```bash
./deploy.sh your-project-id
```

The script enables the required APIs, creates a service account `apu-genai-run` with the **Vertex AI User** role, and builds the container with Cloud Build. It then deploys to `asia-southeast1` (Singapore).

By default the service **requires authentication**. To open it, run `gcloud run services proxy apu-genai-assistant --region asia-southeast1 --port 8080`. Add `-Public` (or `--public` for bash) to allow anyone with the URL. Only do that for a demo, since every request costs model usage.

## GitHub Pages (static demo)

A server-free build of the app runs on GitHub Pages: the same landing page, dashboards, AI tools and assistant, all in demo mode in the browser. Every push to `main` builds and publishes it via [.github/workflows/pages.yml](.github/workflows/pages.yml).

- One-time setup: in the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
- Build and preview locally:

  ```bash
  npm run build:static
  ```

  ```bash
  npm run preview:static
  ```

  Then open http://localhost:4173.
- **Limits:** there's no server on Pages, so there are no Claude answers (demo mode only). The sign-in screen is a front-end gate, not real security: anyone can read the code in a public repository. To change the login, add `APP_USERNAME` and `APP_PASSWORD` as repository secrets. For real Claude answers and secure sign-in, deploy to Cloud Run instead.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_VERTEX_PROJECT_ID` | (none, which means demo mode) | GCP project that hosts Claude on Vertex AI |
| `CLOUD_ML_REGION` | `global` | Vertex AI endpoint for Claude |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Model ID |
| `CLAUDE_FALLBACK_MODEL` | `claude-opus-4-8` | Model to retry on when the main model declines |
| `CLAUDE_EFFORT` | `medium` | `low`, `medium`, `high`, `xhigh` or `max` |
| `DEMO_MODE` | auto | `true` forces demo mode; `false` requires Vertex AI |
| `APP_USERNAME` / `APP_PASSWORD` | built-in demo login | Sign-in credentials |
| `SESSION_SECRET` | random per process | Signs session cookies. The deploy scripts generate one so sign-ins work across instances |
| `PORT` | `8080` | Set by Cloud Run |

## Making it real

- **Knowledge:** replace `knowledge/*.md` with approved APU documents. Set `audience` and `owner` in each file's front matter (see `knowledge/README.md`). For large document sets, swap the BM25 search for Vertex AI Search or a vector index.
- **Personal data:** replace the demo functions at the bottom of `server/tools.ts` with calls to the student information system, LMS, ITSM and research management APIs.
- **Sign-in:** put the service behind APU single sign-on (for example, Identity-Aware Proxy with Microsoft Entra ID). Then derive the persona and user from the signed-in identity instead of the dropdown, which is for demos.
- **Hardening:** the browser sends the conversation history, and the server validates its size and shape but trusts its content. Add per-user rate limits and conversation logging for audit before going live.
