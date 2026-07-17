# lively-bot - Spec

> The AI companion layer for Lively: Mbak Asih and Mas Budi. This spec covers bot-specific implementation: the HTTP reply API, companion prompts, conversation memory, and tool calls back into the backend. WhatsApp webhook handling, message pacing/delivery, and scheduling live in `lively-backend`, not here. The shared data model and API live in [CORE.md](CORE.md).

## 1. Hackathon context

| Field | Value |
|-------|-------|
| Event | Garuda Hacks 7.0 (offline) |
| Submit by | 2026-07-18, exact time 🔴 TBD |
| QUALIFICATION GATE | Working demo + repo + pitch deck submitted |
| Judging | 🔴 TBD, criteria/weights not yet published |

**Chosen track:** Health. Lively targets the health-literacy and eldercare gap between urban and rural Indonesian families named in the theme brief, using WhatsApp-based daily strength coaching, routine medication reminders, and family follow-up signals. This repo is the AI reply engine behind that companion.

## 2. Problem and target user

**User (indirect):** the elder, reached through WhatsApp, handled entirely by `lively-backend`. **This repo's user is `lively-backend` itself** — a trusted service caller, never the elder or a browser. **Problem this repo solves:** given already-processed elder chat text and an elder ID, produce an in-character, consent-respecting companion reply, using conversation memory and backend-recorded elder context.

## 3. Concept

- `lively-backend` owns the WhatsApp Cloud API webhook, platform messaging permission, product consent gate, and Human Texting Engine (splitting/pacing/typing indicator/sending). None of that lives in this repo.
- Backend calls `POST /reply` on this service only after consent allows AI conversation, passing `{ elderId, text }` already extracted from the inbound WhatsApp payload.
- This repo loads per-elder conversation history, builds a system prompt from the assigned persona (Mbak Asih or Mas Budi) plus honorific/health flags/timezone, and asks OpenAI for a reply.
- The model can call tools mid-reply to log exercise completion, record Chair Stand repetitions, or raise an alert — each tool call is a request back to `lively-backend` using `BOT_SERVICE_KEY`.
- The HTTP response is plain reply text. Backend decides how to split, pace, and deliver it to WhatsApp.
- Alternative considered: bot owns the WhatsApp socket directly (previous architecture, Baileys-based). Rejected — WhatsApp connection lifecycle, webhook verification, and delivery pacing are now backend's responsibility, keeping this repo a stateless-per-call AI service plus per-elder conversation memory.

## 4. MVP features (YAGNI-tight)

**In scope:**
- `POST /reply` HTTP endpoint, authenticated with `BOT_SERVICE_KEY`, taking `{ elderId, text }` and returning `{ reply }`.
- Two companion personas with fixed prompts and per-elder context (honorific, health flags, timezone).
- File-backed per-elder conversation memory (`src/memory/store.ts`), trimmed to a bounded window.
- Tool calls into `lively-backend` for exercise-log completion, Chair Stand repetition parsing, and event-based alert creation, using `BOT_SERVICE_KEY`.

**Explicitly NOT in this repo** (owned by `lively-backend` instead) goes in §6.

## 5. Architecture

Node/TypeScript service, no framework — `node:http` server with a single route. OpenAI provides the companion LLM layer; backend owns state, WhatsApp delivery, and scheduling.

```
Elder WhatsApp <-> Meta WhatsApp Cloud API <-> lively-backend
                                                     |  POST /reply {elderId, text}
                                                     v
                                                lively-bot (this repo)
                                                     |
                                    +----------------+----------------+
                                    v                                 v
                              OpenAI (LLM)                    lively-backend tool calls
                              conversation memory              (logs, Chair Stand, alerts)
                                                     |
                                                     v  {reply}
                                              lively-backend
                                       (splits, paces, sends via WhatsApp)
```

Scheduler: owned entirely by `lively-backend` now. Morning check-ins, medication reminders, and no-response checks are triggered and sent by backend; this repo is only invoked for elder-initiated conversational turns via `/reply`. If backend wants an LLM-composed reminder message instead of a fixed template, that would need a separate documented endpoint — not yet in scope.

## 6. Non-goals

- No WhatsApp webhook, Meta Cloud API client, or connection lifecycle in this repo — moved to `lively-backend`.
- No message splitting, pacing, or typing-indicator logic in this repo — moved to `lively-backend`'s Human Texting Engine.
- No native video, photo, image, or media workflow. No photo or voice method for exercise or medication confirmation.
- No voice note ingestion, transcription, or voice interaction in MVP or stretch. Voice is roadmap-only.
- No movement checking, clinical assessment, diagnosis, or standalone health-status determination.
- No crisis interception or background monitoring. Alerts are event-based signals for family follow-up, raised only from within a `/reply` tool call.
- No account/session model in this repo. Bot uses `BOT_SERVICE_KEY` both to authenticate inbound calls from backend and to authenticate its own outbound tool calls to backend; backend owns household accounts, devices, platform permission, and product consent records.

## 7. Risks and unknowns

- 🟡 Event detection for pain/dizziness over free-form Indonesian text can misread intent. Treat outputs as follow-up signals, not verified incidents.
- 🟡 Scheduled/reminder message composition (templated vs. LLM-generated) is still TBD between this repo and backend — currently assumed template-only and fully backend-owned.
- 🟢 OpenAI API integration itself is low-risk.
- 🟢 `/reply` HTTP contract is simple and already implemented with test coverage (`src/server.test.ts`).

## 8. Submission checklist

- [ ] Working demo, `/reply` reachable by backend with at least one real WhatsApp text conversation round-tripped end to end.
- [ ] Public repo with README, LICENSE, `.gitignore`, no committed secrets.
- [ ] Pitch deck, owner 🔴 TBD.

**Doc sources:** none fetched. Facts came from user-approved product decisions and drafting context, updated 2026-07-17 to reflect the AI-only architecture split.
