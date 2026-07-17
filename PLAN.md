# lively-bot - Plan

**Window:** 2026-07-16 to 2026-07-18 (Garuda Hacks 7.0, offline). About 3 days. Solo/small-team repo owner. Architecture changed on 2026-07-17: this repo dropped WhatsApp/Telegram platform integration and is now a pure AI reply service called by `lively-backend`. The highest-risk work — WhatsApp connection lifecycle, webhook verification, delivery pacing — moved to `lively-backend` and is out of scope here.

## Setup

- Env: `PORT`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `BACKEND_API_URL`, `BOT_SERVICE_KEY`, `MEMORY_DIR`. Ship `.env.example` only.
- Tooling: Node/TypeScript, `node:http` (no framework), OpenAI SDK for companion replies, `node:test` for tests.
- Repo: public; README, LICENSE, `.gitignore` in place.

## Definition of Done

1. `POST /reply` accepts `{ elderId, text }` authenticated with `BOT_SERVICE_KEY`, and returns `{ reply }` generated in-character by the assigned companion persona.
2. Per-elder conversation memory persists across calls and stays bounded (`src/memory/store.ts`).
3. Both companion personas (Mbak Asih, Mas Budi) hold a coherent text conversation using backend-supplied elder context (honorific, health flags, timezone).
4. Tool calls from within a reply — exercise-log completion, Chair Stand repetition parsing, event-based alert creation — successfully call back into `lively-backend` using `BOT_SERVICE_KEY`.
5. `lively-backend` can drive a full round trip: elder WhatsApp message in, `/reply` call to this repo, AI text out, backend sends it back over WhatsApp.

## Day-by-day

**Day 1 - 2026-07-16 - initial scaffold**

- Node/TypeScript project scaffolded with WhatsApp (Baileys) and Telegram clients, OpenAI companion loop, file-backed memory, tool-call framework, two companion personas.
- This was built against the original architecture where the bot owned platform messaging directly.

**Day 2 - 2026-07-17 - architecture split to AI-only service**

- Removed `src/whatsapp/*` and `src/telegram/*` (Baileys, grammy, qrcode-terminal, `@hapi/boom` dropped from `package.json`). Backend now owns all WhatsApp integration.
- Removed `src/texting.ts` (splitting/pacing) — that responsibility moves to backend's Human Texting Engine.
- Added `src/server.ts`: minimal `node:http` server exposing `POST /reply`, authenticated with `BOT_SERVICE_KEY`, wired to the existing `companion.ts` reply loop.
- Updated `src/config.ts`/`src/index.ts` to boot the HTTP server instead of platform clients; added `node:test` coverage for the new route.
- Remaining: confirm the exact request/response contract with `lively-backend` (field names, error shape, timeout expectations) and update `CORE.md`'s bot-facing sections if the contract differs from `POST /reply {elderId, text} -> {reply}`.

**Day 3 - 2026-07-18 - integration, polish, demo rehearsal, submit**

- Integration test against a real (or stubbed) `lively-backend`: consent-gated call into `/reply`, tool calls landing in backend, reply text flowing back out.
- Seed a believable text conversation for demo elder "Eyang Uti" through backend, driven by this repo's replies.
- Rehearse live demo 3 times end to end: WhatsApp in -> backend -> `/reply` -> WhatsApp out, Chair Stand reply, medication confirmation, alert signal.
- Submit with margin before deadline.

## Honest feasibility verdict

Risk shifted out of this repo. The remaining risk here is contract drift with `lively-backend` (field names, auth header, error handling) and making sure conversation memory keys (`elderId`) match what backend actually sends. Both are cheap to fix compared to the WhatsApp connectivity risk this repo carried before the split.

Cut-order if time compresses: drop titipan relay tool first, then alert types beyond `pain_mention`/`distress_message`, then Chair Stand parsing. Keep `/reply` working end to end with one companion persona and basic conversation memory — that's the demo spine now that WhatsApp itself is backend's problem.
