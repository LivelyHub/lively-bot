# lively-bot - Spec

> The Python WhatsApp companion: Mbak Asih and Mas Budi. This spec covers bot-specific implementation: Human Texting Engine, companion prompts, Meta WhatsApp Cloud API webhook handling, text-only scheduling, consent handling, and event creation. The shared data model and API live in [CORE.md](CORE.md).

## 1. Hackathon context

| Field | Value |
|-------|-------|
| Event | Garuda Hacks 7.0 (offline) |
| Submit by | 2026-07-18, exact time 🔴 TBD |
| QUALIFICATION GATE | Working demo + repo + pitch deck submitted |
| Judging | 🔴 TBD, criteria/weights not yet published |

**Chosen track:** Health. Lively targets the health-literacy and eldercare gap between urban and rural Indonesian families named in the theme brief, using WhatsApp-based daily strength coaching, routine medication reminders, and family follow-up signals.

## 2. Problem and target user

**User:** the elder, who will not install a new app but already opens WhatsApp. **Problem:** eldercare tools often ask elders to adopt new software. This repo meets them in WhatsApp with warm text messages, while respecting explicit opt-in and sending only event-based signals to family through the backend.

## 3. Concept

- Family setup must not imply Lively can cold-message a number. WhatsApp/business messaging permission must exist first; then an approved template may request Lively product consent. The elder must explicitly give Lively product consent in WhatsApp before AI conversation, scheduled coaching/reminders, family chat visibility, or health-related event sharing starts.
- Elder receives text messages from Mbak Asih or Mas Budi using honorific, short bubbles, and natural pacing.
- Daily loop: greeting, exercise prompt, optional ordinary text link, and casual text completion logging.
- Medication loop: scheduled text reminder, casual text confirmation, missed threshold event if repeated misses occur.
- Chair Stand loop: 30-second progress check, parse text reply with repetitions, respond in plain language without diagnosis.
- Alert loop: if a configured event occurs, bot posts an alert to backend. Backend stores it and sends push.
- Alternative considered: instant LLM replies with no pacing. Rejected because the pacing is part of the product.

## 4. MVP features (YAGNI-tight)

**In scope:**
- Text-only Meta WhatsApp Cloud API webhook flow.
- Human Texting Engine for inbound-response flow, with best-effort typing indicator and fallback pacing.
- Two companion personas with fixed prompts and per-elder context from backend.
- Lively product consent opt-in, withdrawal, and pause handling through backend, distinct from platform messaging permission.
- 30-second Chair Stand text flow and repetition logging.
- Daily exercise check-in and text completion logging.
- Medication reminder at scheduled times and text confirmation/missed logging.
- Event creation for `missed_days`, `pain_mention`, `dizziness_mention`, `medication_missed`, `no_response`, and explicit `distress_message`.
- Titipan relay if time allows.

**Explicitly NOT in MVP** goes in §6.

## 5. Architecture

Python service. Meta WhatsApp Cloud API webhooks handle inbound/outbound text; webhook framework is FastAPI or Flask, still TBD; scheduler is also TBD; OpenAI provides the companion LLM layer; backend API owns state.

```
Elder WhatsApp <-> Meta WhatsApp Cloud API <-> lively-bot (Python)
                                                       |
                                 +---------------------+---------------------+
                                 v                     v                     v
                         Human Texting Engine     OpenAI (LLM)      lively-backend
                         text split/pacing                         BOT_SERVICE_KEY
```

Scheduler: TBD, driving morning check-ins, medication reminders, and no-response checks from backend schedule/context reads. Business-initiated messages, including first contact and reminders outside WhatsApp's 24-hour customer service window, require valid platform messaging permission and approved templates.

## 6. Non-goals

- No native video, photo, image, or media workflow. Ordinary text links are allowed.
- No photo or voice method for exercise or medication confirmation.
- No voice note ingestion, transcription, or voice interaction in MVP or stretch. Voice is roadmap-only.
- No movement checking, clinical assessment, diagnosis, or standalone health-status determination.
- No crisis interception or background monitoring. Alerts are event-based signals for family follow-up.
- No account/session model in this repo. Bot uses `BOT_SERVICE_KEY`; backend owns household accounts, devices, platform permission, and product consent records.

## 7. Risks and unknowns

- 🔴 Official typing indicator behavior is unverified end-to-end on a live phone with the chosen Meta-compatible implementation. Test on a real phone Day 1 morning. Fall back to split-message pacing if unavailable.
- 🔴 Meta Cloud API setup friction is real: app setup, webhook verification, phone-number configuration, and approved templates for business-initiated sends can slow first contact and reminder flows.
- 🟡 Event detection for pain/dizziness over free-form Indonesian text can misread intent. Treat outputs as follow-up signals, not verified incidents.
- 🟡 Scheduler choice and reliability remain TBD under a hackathon demo environment. Keep it simple and test the exact demo-time path Day 3.
- 🟢 OpenAI API integration itself is low-risk.

## 8. Submission checklist

- [ ] Working demo, bot reachable with at least one real WhatsApp text conversation through Meta WhatsApp Cloud API.
- [ ] Public repo with README, LICENSE, `.gitignore`, no committed secrets.
- [ ] Pitch deck, owner 🔴 TBD.

**Doc sources:** none fetched. Facts came from user-approved product decisions and drafting context on 2026-07-16.
