<div align="center">

# ✦ InsightFlow

**Research. Analyze. Create.**

An AI research and content workspace built from two independent FastAPI services,
a React frontend, and Nginx as the public reverse proxy.

</div>

---

## Overview

InsightFlow turns a question into a structured research report, and an idea into
publishable content. It is built as two genuinely independent modules that
communicate over HTTP — neither imports the other's code, and either can be
deployed on its own.

| Module | Workflow | Port |
| --- | --- | --- |
| **Research** | Researcher → Analyst → Reviewer | `8001` |
| **Content Studio** | Researcher → Strategist → Writer → Editor | `8002` |

Every model call goes through [LiteLLM](https://github.com/BerriAI/litellm), so the
provider is a configuration value rather than a code dependency.

---

## Features

- **Two independent services.** Each has its own `Dockerfile`, dependencies, tests
  and `.env`. Neither imports the other.
- **HTTP cross-module calls.** Content Studio can ground a piece in a live
  Research report by calling the Research service over HTTP.
- **Provider-agnostic.** Groq, OpenAI, Anthropic, Gemini and anything else LiteLLM
  supports, selected with one environment variable.
- **Graceful degradation.** If the Research service is unreachable, content is
  still produced and the response says the research step was skipped.
- **Honest preview mode.** With no API key configured, the services return clearly
  labelled placeholder structure rather than pretending to be real analysis.
- **Real health checks.** The Services page reports what the backends actually
  return; nothing is hard-coded as "operational".
- **Polished frontend.** Dark-first theme with a light option, a command palette
  (`⌘K` / `Ctrl+K`), a React Flow architecture graph, and considered empty,
  loading and error states throughout.

---

## Architecture

```
                          INSIGHTFLOW
                               │
                          ┌────▼────┐
                          │  NGINX  │   :8080
                          │ Reverse │
                          │  Proxy  │
                          └────┬────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
                  ▼                         ▼
           React Frontend            FastAPI Services
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                      Research Service            Content Service
                           :8001                       :8002
                              │                           │
                   ┌──────────┼──────────┐      ┌─────┬───┴───┬─────┐
                   ▼          ▼          ▼      ▼     ▼       ▼     ▼
              Researcher  Analyst   Reviewer  Rsrch Strat  Writer Editor
```

Requests from the browser always use relative `/api/*` paths. Nginx decides where
they go, so no host or port is ever compiled into the frontend bundle.

```
/                  →  frontend
/api/research/*    →  research:8001
/api/content/*     →  content:8002
```

When **Use Research** is enabled, the Content service calls the Research service
over HTTP:

```
Content Service ──HTTP──▶ Research Service ──▶ report ──▶ Content workflow
```

---

## Project Structure

```
insightflow/
├── frontend/                   React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/         Shared UI (cards, states, workflow tracker)
│   │   ├── pages/              Overview, Research, Content, Workflow, History…
│   │   ├── layouts/            Application shell
│   │   ├── hooks/              Health polling, history, theme, progress
│   │   ├── services/           API client
│   │   ├── types/              Contracts mirrored from the backends
│   │   ├── utils/              Formatting, markdown renderer
│   │   └── router/
│   ├── Dockerfile
│   └── nginx.conf              Static SPA server (behind the public proxy)
│
├── services/
│   ├── research/               Researcher → Analyst → Reviewer
│   │   ├── app/
│   │   │   ├── agents/         One module per agent
│   │   │   ├── workflows/      Orchestration + offline preview
│   │   │   ├── api/            Routes
│   │   │   ├── models/         Pydantic schemas
│   │   │   ├── services/       LiteLLM abstraction
│   │   │   ├── config/         Settings
│   │   │   └── main.py
│   │   ├── tests/
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── content/                Researcher → Strategist → Writer → Editor
│       └── …                   (same layout, plus services/research_client.py)
│
├── llm/litellm.yaml            Optional LiteLLM proxy config
├── nginx/nginx.conf            Public reverse proxy
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start

### 1. Configure a provider key

```bash
cp .env.example .env
```

Then edit `.env` and set a model plus its matching key:

```env
LLM_MODEL=groq/openai/gpt-oss-120b
GROQ_API_KEY=your-key-here
```

`.env` is gitignored. **Never commit real keys.**

> Without a key the app still runs end to end: both services return clearly
> labelled **preview output** so the whole interface stays explorable.

### 2. Run with Docker

```bash
docker compose up --build
```

| URL | What |
| --- | --- |
| http://localhost:8080 | The application |
| http://localhost:8001/docs | Research API docs |
| http://localhost:8002/docs | Content API docs |

### 3. Or run locally

Three terminals:

```bash
# Research
cd services/research
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

```bash
# Content
cd services/content
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the two
services, mirroring what Nginx does in Docker.

---

## Research Module

Turns a topic into a structured report.

| Agent | Responsibility |
| --- | --- |
| **Researcher** | Breaks the topic into subtopics and writes research notes |
| **Analyst** | Identifies themes and relationships, produces structured analysis |
| **Reviewer** | Removes weak conclusions, improves clarity, assembles the report |

**`POST /run`**

```json
{ "topic": "Impact of AI agents on software development", "depth": "standard" }
```

```json
{
  "status": "completed",
  "topic": "Impact of AI agents on software development",
  "result": {
    "summary": "…",
    "key_findings": ["…"],
    "analysis": "…",
    "insights": ["…"],
    "conclusion": "…",
    "limitations": "…"
  },
  "generated": true
}
```

`depth` is `quick`, `standard` or `deep`. `generated` is `false` when the response
is preview output rather than a real run.

---

## Content Module

Turns a topic into a finished piece.

| Agent | Responsibility |
| --- | --- |
| **Researcher** | Gathers points, examples and terminology |
| **Strategist** | Sets audience, angle, tone, structure and key message |
| **Writer** | Writes the draft against that brief |
| **Editor** | Improves grammar, clarity, structure and flow |

Supported types: `linkedin`, `technical_article`, `blog_post`,
`product_description`, `research_summary`.

**`POST /run`**

```json
{
  "topic": "Explain RAG to software engineers",
  "content_type": "linkedin",
  "tone": "professional",
  "use_research": true
}
```

With `use_research: true` the service calls `RESEARCH_SERVICE_URL` first. If that
call fails, the run still completes and `research_error` explains what was skipped.

---

## LiteLLM

Agents never import a provider SDK. Every call goes through
`app/services/llm.py`, which wraps `litellm.acompletion`.

Switching providers is one line:

```env
LLM_MODEL=groq/openai/gpt-oss-120b     # Groq
LLM_MODEL=openai/gpt-4o-mini           # OpenAI
LLM_MODEL=anthropic/claude-sonnet-4-5  # Anthropic
LLM_MODEL=gemini/gemini-2.0-flash      # Google
```

The client also handles two realities of running against hosted models:

- **Rate limits.** Free tiers often cap tokens per minute, which a multi-agent
  workflow reaches easily. Rate-limited calls are retried with backoff, and a
  persistent limit surfaces as HTTP `429` with a readable message.
- **Truncated responses.** A generation cut off at `max_tokens` leaves invalid
  JSON. The parser repairs it and keeps the fields that arrived rather than
  discarding the whole response.

The bundled `litellm` container is **optional** — a single place to route models
if you want one. Set `LITELLM_BASE_URL=http://litellm:4000` to use it; leave it
blank to call the provider directly.

---

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `LLM_MODEL` | `groq/openai/gpt-oss-120b` | Model, in LiteLLM notation |
| `GROQ_API_KEY` etc. | — | Provider key matching `LLM_MODEL` |
| `LLM_TEMPERATURE` | `0.4` / `0.6` | Sampling temperature |
| `LLM_MAX_TOKENS` | `2000` | Per-call output cap |
| `LLM_TIMEOUT` | `120` | Per-call timeout (seconds) |
| `LLM_MAX_RETRIES` | `3` | Retries on provider rate limits |
| `RESEARCH_SERVICE_URL` | `http://research:8001` | Cross-module dependency |
| `RESEARCH_TIMEOUT` | `180` | Timeout for the research call |
| `LITELLM_BASE_URL` | — | Set to use the optional proxy |
| `NGINX_PORT` | `8080` | Public port |
| `OFFLINE_MODE` | — | Force preview output |

API keys are read by the services only and are **never** exposed to the frontend.

---

## API Documentation

FastAPI generates interactive docs from the Pydantic schemas:

- Research — http://localhost:8001/docs
- Content — http://localhost:8002/docs

Both services expose `GET /health`, `GET /metadata` and `POST /run`.

---

## Testing

```bash
cd services/research && python -m pytest tests -q   # 24 tests
cd services/content  && python -m pytest tests -q   # 31 tests
```

Covers health, metadata, request validation, successful runs, the Research
dependency (including its failure modes), rate limits, and truncated-response
recovery. Tests run without any API key.

```bash
cd frontend
npm run build        # production build + strict TypeScript
```

---

## Troubleshooting

**Everything says "Preview mode".**
No provider key is set. Add one to `.env` and restart. Check
`GET /health` — `llm_available` should be `true`.

**`429` / "rate limit exceeded".**
Free tiers cap tokens per minute and a full workflow makes 3–4 calls. The client
retries automatically; if it persists, wait a minute, lower `LLM_MAX_TOKENS`, or
use a larger tier. On Groq's free tier a `deep` run may exceed the cap.

**Content says the research step was skipped.**
The Content service could not reach the Research service. Confirm it is running
and that `RESEARCH_SERVICE_URL` points at it (`http://research:8001` in Docker,
`http://localhost:8001` locally). The Services page shows this directly.

**A service shows Offline.**
Check `docker compose ps` and `docker compose logs research`. Health is polled
every 30 seconds; you can also press Refresh on the Services page.

**Port already in use.**
Change `NGINX_PORT`, `RESEARCH_PORT` or `CONTENT_PORT` in `.env`.

---

## Future Improvements

- Streaming responses so agent progress reflects real server state rather than an
  estimated cadence
- Optional persistence for run history, which is currently per-browser
- A real search tool for the Researcher agent — reports today reflect model
  knowledge, not live sources
- Per-agent model selection (a cheaper model for research, a stronger one for
  writing)

---

## License

MIT — see [LICENSE](LICENSE).
