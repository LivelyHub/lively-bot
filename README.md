# lively-bot

> AI companion service for Lively: a per-elder companion soul, shaped to each elder's culture and texting style. Pure AI layer — no platform integration lives here. `lively-backend` owns the WhatsApp webhook, message pacing, and delivery; this repo takes already-processed elder chat in and returns a companion reply.

**Status:** 🟡 Implemented, pre-demo. See [SPEC.md](SPEC.md), [PLAN.md](PLAN.md), and shared core [CORE.md](CORE.md).

| | |
|---|---|
| Hackathon | Garuda Hacks 7.0 |
| Submit by | 2026-07-18 · exact time 🔴 TBD · prize 🔴 TBD |
| Track | Health |
| Gate | Working demo + repo + pitch deck submitted |
| Stack | Node/TypeScript · `node:http` · OpenAI |

## How it works

```
lively-backend  --POST /reply-->  lively-bot  --tool calls-->  lively-backend
 (owns WhatsApp,                  (companion prompt,           (elder context,
  webhook, pacing)                 OpenAI, memory)               consent, logs, alerts)
```

1. At elder registration, backend calls `POST /soul` **once** with `{ elderId, soul }` — the elder's companion profile (companion name, honorific, language, culture, texting style, interests, health flags, timezone). It persists in SQLite; there is no per-message persona payload.
2. For each message, backend checks consent and calls `POST /reply` with `{ elderId, text }`, authenticated with `Authorization: Bearer $BOT_SERVICE_KEY`. `src/server.ts` routes to `src/companion.ts`, which loads the elder's soul + long-term remembrance + recent history (`src/memory/`, SQLite), builds a system prompt shaped to that one elder (`src/soul/`), and calls OpenAI.
3. The model may call tools (`src/tools/`) — exercise logs, Chair Stand results, alerts — which call back into `lively-backend` using the same `BOT_SERVICE_KEY`.
4. The final answer text is returned as `{ reply }`. Backend owns splitting, pacing, typing indicators, and actually sending it to WhatsApp.

This repo never talks to WhatsApp or the database directly.

## Notes

- Public repo. No secrets in source. Config uses env vars only. `.env.example` documents names; real values live in a gitignored `.env`.
- Part of a 4-repo Lively build (`lively-landing`, `lively-mobile`, `lively-backend`, `lively-bot`) sharing [CORE.md](CORE.md) verbatim.
- `npm run dev` starts the HTTP service; `npm test` runs the `node:test` suite.

## License

MIT. See LICENSE.
