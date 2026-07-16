# lively-bot — Plan

**Window:** 2026-07-16 → 2026-07-18 (Garuda Hacks 7.0, offline). ~3 days. Solo/small-team repo owner. This is the highest-risk repo (external WhatsApp API, real-time behavior) — build order front-loads the riskiest unknowns per the original build order.

## Setup (Day 0 / early Day 1)
- Env: `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `BACKEND_API_URL`, `BOT_SERVICE_KEY`. Ship `.env.example` only.
- Accounts: Meta developer app + WhatsApp Cloud API test number, OpenAI API key.
- Tooling: Python, a webhook framework (e.g. FastAPI/Flask — 🟡 pick Day 1), a scheduler for reminders (e.g. APScheduler or a cron-style loop — 🟡 pick Day 1).
- Repo: public; README skeleton + license + `.gitignore` (this pass).

## Definition of Done (the bar)
1. WhatsApp Cloud API echo bot working, typing indicator verified rendering on a real phone (not just API docs) — the single most important early validation.
2. Human Texting Engine middleware live: every outbound message goes through typing-indicator → delay → send, never under ~2s.
3. Both companion personas (Mbak Asih, Mas Budi) hold a coherent conversation, remember elder context (grandchild names, prior complaints), and can be swapped mid-conversation.
4. 30-second chair-test flow: guides it step by step, parses a messy natural-language reply, logs via `POST /assessments/chair-test`.
5. Daily exercise check-in + medicine reminder both fire at scheduled times and log completions/doses via the backend.
6. Safety detection: pain/dizziness mention → immediate `pain_mention`/`dizziness_mention` alert; no elder reply within window → `no_response` alert.
> Item 1 is the highest-risk, do-first item — if typing indicators don't render, the entire "human texting" pitch collapses. Verify before building anything else.

## Day-by-day
**Day 1 — 2026-07-16 — WhatsApp connectivity + Human Texting Engine (highest-risk first)**
- WhatsApp Cloud API echo bot: receive a message, send one back. Verify typing indicator renders on a real phone. 🔴 If it doesn't render as expected, this is the moment to fall back to timed message-splitting alone — decide immediately, don't lose a day discovering this on Day 2.
- Build the Human Texting Engine middleware (split → typing indicator → delay → send), ~100 lines, reusable for every message type below.
- Draft both companion system prompts (personality + texting-style rules + safety base layer), parameterized by honorific + health flags.

**Day 2 — 2026-07-17 — conversation logic + backend integration**
- Wire conversation state + memory (grandchild names, complaints) persisted via `lively-backend` (`POST /bot/inbound`, `POST /bot/outbound`).
- Build the 30s chair-test flow (guided steps + messy-reply parsing).
- Build daily exercise check-in scheduler + medicine reminder scheduler (per CORE.md §5) — both use the same Human Texting Engine.
- Build safety detection (pain/dizziness keyword + LLM-assisted detection → `POST /alerts`) and the no-response timeout check.
- Voice note transcription (speech-to-text) — 🟡 stretch, cut first if time compresses.

**Day 3 — 2026-07-18 — polish, demo rehearsal, submit**
- Seed demo elder "Eyang Uti" conversation history for a believable Chat Monitor.
- Rehearse the live demo (typing-indicator magic moment, messy chair-test reply, missed-day/medicine-missed alert) 3× with a timer.
- Submit with margin before deadline.

## Honest feasibility verdict
This is the repo most likely to slip — WhatsApp Cloud API setup (business verification, test numbers, webhook config) has more external friction than any other repo's stack, and the typing-indicator behavior is unverified until tested live. Mitigation: verify typing indicators in the first hour of Day 1, not Day 3, per the original build order's explicit warning.

Cut-order if time compresses: drop voice-note transcription first, then medicine reminders (fall back to exercise-only check-ins), then the `no_response` timeout alert (keep `pain_mention`/`dizziness_mention` — those are cheaper, keyword-triggered, and safety-critical). The irreducible core is the Human Texting Engine + one working companion persona + the chair-test flow — that's the demo's spine.
