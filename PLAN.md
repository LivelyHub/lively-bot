# lively-bot - Plan

**Window:** 2026-07-16 to 2026-07-18 (Garuda Hacks 7.0, offline). About 3 days. Solo/small-team repo owner. This is the highest-risk repo because WhatsApp connection behavior and real-time text pacing must work live.

## Setup (Day 0 / early Day 1)

- Env: `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `BACKEND_API_URL`, `BOT_SERVICE_KEY`. Ship `.env.example` only.
- Accounts: Meta developer app, configured WhatsApp Cloud API webhook, dedicated Meta WhatsApp test number or configured phone number, OpenAI API key.
- Tooling: Python, FastAPI or Flask still TBD for the webhook, APScheduler or a simple loop still TBD for Lively-owned scheduling, OpenAI for companion replies.
- Repo: public; README skeleton + license + `.gitignore` already planned.

## Definition of Done

1. Meta WhatsApp Cloud API echo bot receives and sends real text messages on a phone.
2. Human Texting Engine works for inbound-response flow: split text, pace conservatively, use typing indicator best-effort, and fall back cleanly if unavailable.
3. Both companions hold a text conversation and use backend consent-gated context.
4. Backend-driven consent gate keeps platform messaging permission separate from Lively product consent. First contact and reminders outside WhatsApp's 24-hour customer service window use approved templates only when platform permission exists, and product consent still gates when the bot may start AI conversation, scheduled coaching/reminders, family chat visibility, or health-related event sharing.
5. 30-second Chair Stand flow guides the elder, parses a messy text reply, and logs repetitions through backend.
6. Daily exercise check-in and medication reminders fire from Lively-owned scheduler and log text confirmations.
7. Event-based alert creation works for pain mention, dizziness mention, missed days, medication missed, no response, and explicit distress text.

## Day-by-day

**Day 1 - 2026-07-16 - WhatsApp connectivity + Human Texting Engine**

- Cloud API echo bot: configure Meta developer app webhook verification, receive a text message, send one back through the test number, test on a real phone.
- Validate official Meta-compatible typing indicator behavior in inbound-response flow. 🔴 If it does not render, fall back to timed message splitting and conservative pacing immediately.
- Build Human Texting Engine middleware: split, sequence conservatively, wait for delivery where practical, pace, send. Do not assume split-message request order is guaranteed.
- Draft both companion prompts, parameterized by honorific, health flags, timezone, platform permission state, and product consent status.

**Day 2 - 2026-07-17 - platform permission, product consent, conversation, scheduler**

- Wire backend auth with `BOT_SERVICE_KEY` and implement product consent writes through `POST /bot/consent`; do not send product-consent templates unless platform messaging permission exists.
- Wire conversation state and logging through `POST /bot/inbound`, `POST /bot/outbound`, and `GET /elders/:id`.
- Build 30-second Chair Stand text flow and log via `POST /assessments/chair-test`.
- Build Lively-owned scheduler reading `GET /bot/schedule` for coaching, medication reminders, and no-response checks.
- Build event creation via `POST /alerts`. Keep alerts as follow-up signals, not verified incidents.

**Day 3 - 2026-07-18 - polish, demo rehearsal, submit**

- Seed a believable text conversation for demo elder "Eyang Uti" through backend.
- Rehearse live demo 3 times: opt-in, typing/pacing, Chair Stand reply, medication confirmation, alert signal.
- Submit with margin before deadline.

## Honest feasibility verdict

This repo is most likely to slip because Meta Cloud API setup friction is real: developer app setup, webhook verification, test-number configuration, and approved templates for business-initiated sends can slow first contact and reminder flows. Typing-indicator behavior is also unverified until tested live. Mitigation: prove real text send/receive and typing-indicator fallback in the first hour of Day 1.

Cut-order if time compresses: drop titipan first, then medication reminders, then no-response alert. Keep text conversation, platform permission/product consent gates, one companion persona, Chair Stand flow, and pain/dizziness event creation because those carry the demo spine. Voice note transcription is not in MVP or stretch.
