<div align="center">

# ✦ InsightFlow

**Research. Analyze. Create.**

An AI research and content workspace built from two independently deployable
FastAPI services, a React frontend, and Nginx as the public reverse proxy.

</div>

---

## Table of Contents

- [What this does](#what-this-does)
- [How a request actually flows](#how-a-request-actually-flows)
- [Modular deployment](#modular-deployment)
- [Running it](#running-it)
- [The Research module](#the-research-module)
- [The Content module](#the-content-module)
- [LiteLLM and model configuration](#litellm-and-model-configuration)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Design decisions](#design-decisions)
- [Future improvements](#future-improvements)

---

## What this does

InsightFlow does two things, and deliberately only two.

**1. Research** — you give it a topic, it returns a structured report.

Three agents run in sequence, each consuming the previous one's output:

```
Researcher  ──▶  Analyst  ──▶  Reviewer  ──▶  Report
```

- **Researcher** breaks the topic into subtopics and writes notes on each
- **Analyst** reads those notes, finds the themes that carry weight, states the
  relationships between them
- **Reviewer** strips out weak conclusions, tightens the prose, assembles the
  final report

You get back an executive summary, key findings, detailed analysis, insights, a
conclusion, and a limitations section.

**2. Content Studio** — you give it a topic and a format, it returns a finished piece.

Four agents, same pattern:

```
Researcher  ──▶  Strategist  ──▶  Writer  ──▶  Editor  ──▶  Content
```

- **Researcher** gathers the points, examples and terminology
- **Strategist** decides the audience, angle, tone, structure and key message
- **Writer** writes the draft against that brief
- **Editor** fixes grammar, clarity, structure and flow

Five formats: LinkedIn post, technical article, blog post, product description,
research summary.

**The two connect.** Flip **Use Research** on in Content Studio and the Content
service calls the Research service over HTTP first, then writes the piece grounded
in that report. This is the only coupling between the modules, and it is a network
call — not a shared import.

### What it does not do

It does not search the internet. Reports come from the model's training knowledge,
and the `limitations` field of every report says so. If you need live sources, that
is listed under [Future improvements](#future-improvements).

---

## How a request actually flows

Worth understanding before you change anything, because the indirection is
deliberate.

**A plain research run:**

```
Browser                                    You type a topic, hit Start
   │  POST /api/research/run               ← relative path, no host, no port
   ▼
Nginx :8080                                Matches /api/research/, strips the prefix
   │  POST /run
   ▼
research:8001                              Researcher → Analyst → Reviewer
   │                                       (3 LiteLLM calls)
   ▼
Groq / OpenAI / Anthropic / …
```

**A research-grounded content run** (`use_research: true`) — note the second hop:

```
Browser
   │  POST /api/content/run  { "use_research": true }
   ▼
Nginx :8080
   │  POST /run
   ▼
content:8002
   │
   │  ── HTTP ──▶  research:8001    ← the cross-module call
   │               Researcher → Analyst → Reviewer
   │  ◀── report ──
   │
   ▼  Researcher → Strategist → Writer → Editor
   (4 more LiteLLM calls, now grounded in the report)
```

That's up to **7 model calls** in one request, which matters for rate limits — see
[Troubleshooting](#troubleshooting).

### Why the frontend never knows a port

Every browser request uses a relative `/api/*` path. The bundle contains no
hostname and no port. Whoever sits in front decides where it goes:

| Environment | Who routes `/api/*` | Configured in |
| --- | --- | --- |
| Docker | Nginx | `nginx/nginx.conf` |
| Local dev | Vite dev proxy | `frontend/vite.config.ts` |

So the same build artifact works in dev, in Docker, and behind whatever proxy you
put it behind in production. You can verify it yourself:

```bash
cd frontend && npm run build
grep -c "localhost:800" dist/assets/*.js   # → 0
```

---

## Modular deployment

This is the part worth reading carefully, because "modular" is easy to claim and
easy to get wrong.

### The rule

**Neither service imports the other.** Not a shared `common/` package, not a
`from research.models import …`, nothing. The only thing crossing the boundary is
HTTP, and every call goes through one file:

```
services/content/app/services/research_client.py
```

That file knows one thing about Research: a URL, read from the environment
(`settings.py` loads it; `/metadata` reports it; nothing else touches it).

```python
self.base_url = settings.research_service_url   # RESEARCH_SERVICE_URL
```

Change that variable and Content talks to a Research service anywhere — another
container, another host, another cluster. Nothing is recompiled.

### What this buys you

**Deploy either one alone.** Each service is a self-contained directory with its
own `Dockerfile`, `requirements.txt`, tests and `.env.example`:

```bash
# Research on its own — no reference to Content anywhere
cd services/research
docker build -t insightflow-research .
docker run -p 8001:8001 -e GROQ_API_KEY=… insightflow-research
```

Research has **no knowledge that Content exists**. The dependency runs one way.

**Scale them separately.** Content does ~4 model calls per request and Research
~3, and their traffic patterns differ. Run three Content replicas against one
Research instance if that's your shape:

```bash
docker compose up --scale content=3
```

**Fail independently.** If Research goes down, Content keeps working. The run
completes without grounding and tells you what happened:

```json
{
  "status": "completed",
  "used_research": false,
  "research_error": "The Research service could not be reached. The content was written without research.",
  "result": { "…": "a complete piece of content" }
}
```

A dependency outage degrades the result; it does not produce an error page. This
is covered by a test:

```
test_run_degrades_gracefully_when_research_is_unavailable
```

**Test them separately.** Both suites run with no API key and no sibling service.
The Research dependency is stubbed at the HTTP client boundary:

```bash
cd services/research && python -m pytest tests -q   # 24 passed
cd services/content  && python -m pytest tests -q   # 31 passed
```

### The seam, concretely

| | Research | Content |
| --- | --- | --- |
| Port | `8001` | `8002` |
| Agents | 3 | 4 |
| Knows about the other? | **No** | Yes — one URL, from env |
| Deployable alone? | Yes | Yes (degrades without Research) |
| Own Dockerfile / deps / tests | Yes | Yes |

### Internal layout

Both services use the same layout, so moving between them costs nothing:

```
app/
├── agents/       one file per agent — prompt + output parsing
├── workflows/    orchestration; runs agents in order
├── api/          FastAPI routes
├── models/       Pydantic request/response contracts
├── services/     LiteLLM wrapper (+ research_client.py in Content)
├── config/       settings from environment
└── main.py       app factory, CORS, error handlers
```

Adding an agent means adding a file in `agents/` and a line in the workflow. The
API contract doesn't move.

### Where the boundary is deliberately *not* drawn

There is no shared library, no API gateway service, no message broker, no
database. Two services that talk over HTTP need none of those, and each would be
another thing to run and reason about. The
[Design decisions](#design-decisions) section explains what was left out on
purpose.

---

## Running it

### Prerequisites

- **Docker** — for the container path
- **Python 3.11+** and **Node 20+** — for the local path
- An API key from any provider LiteLLM supports (Groq's free tier works)

> **No key?** It still runs. Both services return clearly labelled **preview
> output** so the whole interface is explorable. You just won't get real analysis.

### 1. Configure

```bash
cp .env.example .env
```

Edit `.env` — set a model and its matching key:

```env
LLM_MODEL=groq/openai/gpt-oss-120b
GROQ_API_KEY=your-key-here
```

`.env` is gitignored. **Never commit real keys.**

### 2a. Run with Docker (recommended)

```bash
docker compose up --build
```

| URL | What |
| --- | --- |
| **http://localhost:8080** | **The application** |
| http://localhost:8001/docs | Research API docs |
| http://localhost:8002/docs | Content API docs |

Five containers come up: `nginx`, `frontend`, `research`, `content`, `litellm`.

```bash
docker compose ps              # check status
docker compose logs -f content # follow one service
docker compose down            # stop
```

### 2b. Or run locally

Three terminals.

```bash
# 1 — Research
cd services/research
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

```bash
# 2 — Content
cd services/content
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

```bash
# 3 — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev proxy forwards `/api/*` to the two
services, doing what Nginx does in Docker.

> **Ports already taken?** Run the services anywhere and point the proxy at them:
>
> ```bash
> uvicorn app.main:app --port 8101                         # research
> RESEARCH_SERVICE_URL=http://127.0.0.1:8101 \
>   uvicorn app.main:app --port 8102                       # content
>
> RESEARCH_SERVICE_URL=http://127.0.0.1:8101 \
> CONTENT_SERVICE_URL=http://127.0.0.1:8102 npm run dev    # frontend
> ```
>
> The browser still calls `/api/*`; only the proxy target moves.

### 3. Confirm it's working

```bash
curl http://localhost:8001/health
# {"status":"healthy","module":"research","llm_available":true}

curl http://localhost:8002/health
# {…,"llm_available":true,"research_reachable":true}
```

`llm_available: true` means your key is loaded. `research_reachable: true` means
Content can see Research. Both are also shown on the **Services** page in the UI.

### 4. Try it

In the app:

- **Research Studio** — enter a topic, pick a depth, Start Research
- **Content Studio** — enter a topic, pick a format, toggle **Use Research** to
  trigger the cross-service call
- **Workflow** — the architecture graph; click a node for agent detail
- **Services** — live health for both backends
- **⌘K** / **Ctrl+K** — command palette

---

## The Research module

**Port `8001`** · `services/research/`

| Agent | Responsibility |
| --- | --- |
| **Researcher** | Breaks the topic into subtopics, writes research notes, flags key concepts |
| **Analyst** | Identifies themes and relationships, produces structured analysis |
| **Reviewer** | Removes weak conclusions, improves clarity, assembles the report |

### `POST /run`

```json
{ "topic": "Impact of AI agents on software development", "depth": "standard" }
```

`depth` controls breadth: `quick` (3 subtopics), `standard` (4–5), `deep` (6–7).

```json
{
  "status": "completed",
  "topic": "Impact of AI agents on software development",
  "depth": "standard",
  "result": {
    "summary": "…",
    "key_findings": ["…"],
    "analysis": "…",
    "insights": ["…"],
    "conclusion": "…",
    "limitations": "…"
  },
  "duration_ms": 10957,
  "model": "groq/openai/gpt-oss-120b",
  "generated": true
}
```

`generated: false` means preview output — no key configured. The UI shows a banner
when it sees this.

### Other endpoints

| | |
| --- | --- |
| `GET /health` | Liveness + whether credentials are loaded |
| `GET /metadata` | Module info and agent list (never system prompts) |
| `GET /docs` | Interactive OpenAPI docs |

---

## The Content module

**Port `8002`** · `services/content/`

| Agent | Responsibility |
| --- | --- |
| **Researcher** | Gathers points, examples, terminology, common misconceptions |
| **Strategist** | Sets audience, angle, tone, structure, key message |
| **Writer** | Writes the draft against that brief |
| **Editor** | Improves grammar, clarity, structure, flow; removes repetition |

Formats: `linkedin`, `technical_article`, `blog_post`, `product_description`,
`research_summary`.
Tones: `professional`, `conversational`, `authoritative`, `friendly`, `technical`.

### `POST /run`

```json
{
  "topic": "Explain RAG to software engineers",
  "content_type": "linkedin",
  "tone": "professional",
  "use_research": true
}
```

```json
{
  "status": "completed",
  "used_research": true,
  "research_error": null,
  "result": {
    "title": "…",
    "body": "…",
    "strategy": { "audience": "…", "angle": "…", "key_message": "…", "structure": ["…"] },
    "editor_notes": ["…"],
    "word_count": 239
  },
  "generated": true
}
```

**Two fields worth understanding:**

- `used_research` — whether a report *actually* informed this piece. It is `true`
  only if the call succeeded **and** returned real generated output. Preview
  research does not count as grounding.
- `research_error` — set when research was requested but skipped. The content is
  still there; this explains what was missed.

The same `/health`, `/metadata` and `/docs` endpoints apply. Content's `/health`
additionally reports `research_reachable`.

---

## LiteLLM and model configuration

Agents never import a provider SDK. No `openai`, no `anthropic`, no
`google-generativeai` anywhere in agent code. Every call goes through one wrapper:

```
app/services/llm.py  →  litellm.acompletion(…)
```

Switching providers is one environment variable:

```env
LLM_MODEL=groq/openai/gpt-oss-120b     # Groq
LLM_MODEL=openai/gpt-4o-mini           # OpenAI
LLM_MODEL=anthropic/claude-sonnet-4-5  # Anthropic
LLM_MODEL=gemini/gemini-2.0-flash      # Google
```

Set the matching key (`GROQ_API_KEY`, `OPENAI_API_KEY`, …) and restart. No code
changes.

### What the wrapper handles for you

Two things break constantly when running multi-agent workflows against hosted
models, so they're handled centrally:

**Rate limits.** Free tiers cap tokens per minute, and a workflow makes 3–7 calls
back to back. Rate-limited calls are retried with jittered backoff, honouring the
provider's suggested wait. A persistent limit surfaces as HTTP `429` with a
readable message — not a generic failure.

**Truncated responses.** A generation cut off at `max_tokens` leaves invalid JSON
(unterminated strings, unclosed brackets). Rather than discarding a long, mostly
complete generation, the parser repairs it and keeps the fields that arrived.
Tested against six truncation shapes.

### The optional proxy

The `litellm` container in Compose is **optional** — a single place to route and
swap models if you want one. By default the services call the provider directly.

```env
LITELLM_BASE_URL=http://litellm:4000   # route through the proxy
LITELLM_BASE_URL=                      # call the provider directly (default)
```

Models are declared in `llm/litellm.yaml`. Keys are read from the environment;
none are stored in that file.

### Keys never reach the browser

API keys are read by the Python services only. The frontend calls relative
`/api/*` paths and has no credential of any kind. Nothing in the bundle is secret.

---

## Environment variables

Copy `.env.example` to `.env`. Every value has a working default except the key.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LLM_MODEL` | `groq/openai/gpt-oss-120b` | Model, in LiteLLM notation |
| `GROQ_API_KEY` *(or `OPENAI_…`, `ANTHROPIC_…`, `GEMINI_…`)* | — | Key matching `LLM_MODEL` |
| `LLM_TEMPERATURE` | `0.4` research / `0.6` content | Sampling temperature |
| `LLM_MAX_TOKENS` | `2000` | Per-call output cap |
| `LLM_TIMEOUT` | `120` | Per-call timeout (seconds) |
| `LLM_MAX_RETRIES` | `3` | Retries on provider rate limits |
| `RESEARCH_SERVICE_URL` | `http://research:8001` | **The cross-module dependency** |
| `RESEARCH_TIMEOUT` | `180` | Timeout for the research call |
| `LITELLM_BASE_URL` | — | Set to use the optional proxy |
| `NGINX_PORT` | `8080` | Public port |
| `RESEARCH_PORT` / `CONTENT_PORT` | `8001` / `8002` | Host port mappings |
| `CORS_ORIGINS` | `*` | Tighten for production |
| `OFFLINE_MODE` | — | Force preview output even with a key |

> In Docker, `RESEARCH_SERVICE_URL` must be `http://research:8001` — the service
> name on the Compose network. `localhost` inside a container means *that
> container*, so it would not resolve.

---

## Project structure

```
insightflow/
├── frontend/                   React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/         Shared UI (cards, states, workflow tracker, nodes)
│   │   ├── pages/              Overview, Research, Content, Workflow, History…
│   │   ├── layouts/            Application shell
│   │   ├── hooks/              Health polling, history, theme, progress, copy
│   │   ├── services/           API client — the only place fetch is called
│   │   ├── types/              Contracts mirrored from the backends
│   │   ├── utils/              Formatting, markdown renderer
│   │   └── router/
│   ├── Dockerfile              Multi-stage: node build → nginx serve
│   └── nginx.conf              Static SPA server (behind the public proxy)
│
├── services/
│   ├── research/               ── deployable on its own ──
│   │   ├── app/
│   │   │   ├── agents/         researcher · analyst · reviewer
│   │   │   ├── workflows/      orchestration + offline preview
│   │   │   ├── api/  models/  services/  config/  main.py
│   │   │   └── services/llm.py     LiteLLM wrapper
│   │   ├── tests/              24 tests, no key required
│   │   ├── requirements.txt    own dependencies
│   │   ├── Dockerfile          own image
│   │   └── .env.example        own config
│   │
│   └── content/                ── deployable on its own ──
│       ├── app/
│       │   ├── agents/         researcher · strategist · writer · editor
│       │   └── services/
│       │       ├── llm.py              LiteLLM wrapper
│       │       └── research_client.py  ← all cross-module HTTP lives here
│       ├── tests/              31 tests, no key or sibling service required
│       └── …                   (same layout)
│
├── llm/litellm.yaml            Optional LiteLLM proxy config
├── nginx/nginx.conf            Public reverse proxy — the routing table
├── docker-compose.yml          Five services on one network
├── .env.example
└── README.md
```

---

## Testing

### Backend

```bash
cd services/research && python -m pytest tests -q   # 24 passed
cd services/content  && python -m pytest tests -q   # 31 passed
```

Both run **without an API key and without the other service**. Coverage:

- health and metadata contracts
- request validation (empty topic, bad content type, bad tone, bad depth)
- successful runs with the model stubbed
- **cross-module behaviour** — research used, research unreachable, research
  returning preview output
- rate limits surfacing as `429`
- truncated-JSON recovery
- system prompts never appearing in any response

### Frontend

```bash
cd frontend
npm run build        # strict TypeScript + production build
```

Strict mode with `noUnusedLocals` and `noUnusedParameters`; the build fails on any
type error.

---

## Troubleshooting

**Everything says "Preview mode".**
No provider key is loaded. Check `.env`, then `curl localhost:8001/health` —
`llm_available` should be `true`. In Docker, `docker compose up` must be run from
the directory containing `.env`.

**`429` / "rate limit exceeded".**
A workflow makes 3–7 model calls in quick succession, and free tiers cap tokens
per minute. The client retries automatically, so requests get slower rather than
failing. If it persists: wait a minute, lower `LLM_MAX_TOKENS`, use `quick` depth,
or move to a paid tier. On Groq's free tier (8000 TPM) a `deep` run or a
research-grounded article can exceed the cap.

**Content says the research step was skipped.**
Content couldn't reach Research. Check that Research is running, then check
`RESEARCH_SERVICE_URL`:

| Setup | Correct value |
| --- | --- |
| Docker | `http://research:8001` |
| Local | `http://localhost:8001` |

The Services page shows `research_reachable` directly.

**A service shows Offline.**

```bash
docker compose ps
docker compose logs research
```

Health is polled every 30s; the Services page also has a Refresh button.

**Port already in use.**
Change `NGINX_PORT`, `RESEARCH_PORT` or `CONTENT_PORT` in `.env`. Running locally,
see the port note under [Running it](#2b-or-run-locally).

**Frontend loads but every API call fails.**
The proxy isn't reaching the services. In dev, Vite must have been started with
`RESEARCH_SERVICE_URL` / `CONTENT_SERVICE_URL` pointing at wherever they actually
run. Confirm directly:

```bash
curl http://localhost:5173/api/research/health
```

---

## Design decisions

Some things were deliberately left out. Each would be defensible in a larger
system; none earns its keep here.

**No API gateway service.** Nginx is the reverse proxy. A separate gateway would
add a hop, a process, and a second place to define routing — for no behaviour the
proxy doesn't already provide.

**No database.** Nothing needs to survive a restart. Run history lives in
`localStorage`, which keeps it per-browser and means one less container. Making
history durable is listed below as a real improvement, not an oversight.

**No message broker or task queue.** Workflows are synchronous request/response
and finish in seconds. A queue would buy asynchrony nothing currently needs, at
the cost of a broker, a worker pool, and job-state plumbing.

**No shared library between services.** A `common/` package is the usual way
"independent services" quietly stop being independent — a shared model change then
forces a lockstep deploy. The duplication between the two `llm.py` files is
intentional and cheap.

**No tracing or token-tracking stack.** Standard Python logging and `/health`
endpoints answer the questions that come up at this size.

**Preview output is labelled, not faked.** Without a key, responses carry
`generated: false` and the UI shows a banner. Plausible-looking placeholder text
presented as real analysis would be worse than no output at all.

---

## Future improvements

- **Streaming responses.** The agent progress tracker currently advances on an
  estimated cadence, because the services return a single response. Server-sent
  events would make it reflect real server state.
- **Durable run history.** Today it's `localStorage` — per-browser and lost when
  cleared.
- **A real search tool for the Researcher.** Reports reflect model knowledge, not
  live sources. Every report's `limitations` section says so; a search tool would
  change that.
- **Per-agent model selection.** A cheap model for research, a stronger one for
  writing.
- **Authentication.** There is none. Add it before exposing this beyond localhost.

---

## License

MIT — see [LICENSE](LICENSE).
