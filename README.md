# lively-bot

AI companion service for **Lively** — the reply engine behind a WhatsApp-based eldercare companion for Indonesian families.

`lively-bot` builds a per-elder "soul" (companion name, honorific, culture, texting style, health flags) and turns an incoming chat message into a companion reply, calling back into [`lively-backend`](../lively-backend) for anything that needs to be logged, tracked, or escalated. It never talks to WhatsApp or a database directly — that's `lively-backend`'s job.

> [!NOTE]
> Built for **Garuda Hacks 7.0** (Health track). Part of a four-repo system — `lively-landing`, `lively-mobile`, `lively-backend`, `lively-bot` — sharing a common data/API contract documented in [CORE.md](CORE.md).

## How it works

```
lively-backend  --POST /reply-->  lively-bot  --tool calls-->  lively-backend
 (owns WhatsApp,                  (companion prompt,           (exercise logs,
  webhook, pacing)                 OpenAI, memory)               alerts, consent)
```

1. **Setup, once per elder.** Backend calls `POST /soul` with the elder's companion profile (name, honorific, language, culture, texting style, interests, health flags, timezone). It's persisted to SQLite — there's no per-message persona payload.
2. **Per message.** Backend checks consent, then calls `POST /reply` with `{ elderId, text }`, authenticated via `Authorization: Bearer $BOT_SERVICE_KEY`. The request is routed to the companion orchestrator, which loads the elder's soul, long-term memory, and recent history, builds a system prompt shaped to that one elder, and calls the LLM.
3. The model can invoke tools — logging an exercise, recording a Chair Stand result, raising a safety alert — which call back into `lively-backend` using the same service key.
4. The reply text comes back as `{ reply }`. Backend owns splitting, pacing, typing indicators, and delivery to WhatsApp.

## Tech stack

- **Runtime:** Node.js + TypeScript (ESM/NodeNext), served over raw `node:http` — no web framework
- **LLM:** OpenAI SDK, compatible with OpenRouter as a fallback provider
- **Persistence:** `better-sqlite3` for per-elder soul and conversation memory
- **Logging:** `pino` / `pino-pretty`

## Getting started

### Prerequisites

- Node.js 20+
- An OpenAI (or OpenRouter) API key

### Install and run

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev             # tsx watch on src/index.ts
```

Other scripts:

| Command | Description |
|---|---|
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the `node:test` suite |

### Configuration

Set these in `.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (defaults to `7002`) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL` | Primary LLM provider |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL` | Fallback LLM provider |
| `BACKEND_API_URL` | Base URL of `lively-backend`, for tool calls |
| `BOT_SERVICE_KEY` | Shared secret authenticating bot ↔ backend calls |
| `DATABASE_PATH` | Path to the SQLite database file |

> [!WARNING]
> Never commit real values — `.env` is gitignored. Only `.env.example` (names, no secrets) belongs in source control.

### Docker

```bash
docker build -t lively-bot .
docker run -p 7002:7002 --env-file .env lively-bot
```

The image is a multi-stage `node:20-slim` build (native `better-sqlite3` compiled at build time), runs as a non-root user, and listens on port `7002`.

## Project structure

```
src/
├── server.ts       # HTTP routes: /reply, /soul
├── companion.ts    # reply orchestration
├── soul/           # persona / system-prompt construction
├── memory/         # SQLite-backed per-elder memory
├── tools/          # tool-call definitions + backend HTTP client
├── llmClient.ts    # OpenAI/OpenRouter wrapper
├── config.ts       # env loading
└── logger.ts       # pino logger
```

