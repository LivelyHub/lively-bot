# lively-bot — Spec

> The Python WhatsApp companion — Mbak Asih and Mas Budi. This spec covers only the bot-specific implementation (Human Texting Engine, companion prompts, WhatsApp webhook, scheduling) — the shared data model and API live in [CORE.md](CORE.md).

## 1. Hackathon context
| Field | Value |
|-------|-------|
| Event | Garuda Hacks 7.0 (offline) |
| Submit by | 2026-07-18 — exact time 🔴 TBD |
| QUALIFICATION GATE | Working demo + repo + pitch deck submitted |
| Judging | 🔴 TBD — criteria/weights not yet published |

**Chosen track:** Health — Lively targets the health-literacy and eldercare gap between urban and rural Indonesian families named in the theme brief, using a fall-risk assessment (30s Chair Stand), daily strength coaching, medicine adherence, and safety escalation as the clinical/care backbone. This repo is where all of that actually talks to the elder.

## 2. Problem & target user
**User:** the elder themselves — someone who will never install an app, but already opens WhatsApp daily. **Problem:** existing eldercare tech assumes the elder adopts something new; this repo's entire job is to meet them exactly where they already are, in a way that doesn't feel like a bot (which elders notice and disengage from) and that catches real risk — a missed dose, a fall, a symptom mentioned in passing — before it becomes a crisis nobody in the family hears about until too late.

## 3. Concept
- Elder receives a warm, human-paced WhatsApp message from their assigned companion (Mbak Asih or Mas Budi) — typing indicator, short bubbles, natural delay, always using their honorific.
- Daily loop: morning greeting → exercise prompt (5 min routine, video) → casual-reply completion logging.
- Medicine loop: at each scheduled dose time, a reminder in the same voice; a casual confirmation reply logs it.
- Assessment loop: guided 30s Chair Stand test in short texts, parses messy natural-language replies ("kayaknya 8 apa 9 ya"), returns an encouraging plain-language fall-risk reading.
- Safety loop: any pain/dizziness mention, or the elder going quiet past a response window, triggers an alert to the family — silently, without alarming the elder mid-conversation.
- Family loop: a "titipan" message from `lively-mobile` gets relayed in-character ("Eyang, ada titipan pesan dari Mbak Dina…").
- Alternative considered: instant LLM replies with no pacing. Rejected — per the original design, bots that reply instantly with a wall of text are exactly what makes elders disengage; the pacing *is* the product's differentiator.

## 4. MVP features (YAGNI-tight)
**In scope (the demoable spine):**
- Human Texting Engine (typing indicator + message splitting + natural delay) — the foundation everything else runs on
- Two companion personas (Mbak Asih, Mas Budi) with fixed, hand-crafted system prompts + per-elder memory
- 30-second Chair Stand test flow, messy-reply parsing, plain-language result
- Daily exercise check-in + casual-reply completion logging
- Medicine reminder at scheduled times + casual-reply dose confirmation
- Safety detection: pain/dizziness mention → immediate alert; no-response timeout → alert
- Titipan relay (family message delivered in-character)

**Explicitly NOT in MVP** → §6.

## 5. Architecture
Python service. Webhook receiver for Meta WhatsApp Cloud API inbound messages; scheduler for outbound check-ins/reminders; OpenAI for the companion LLM layer.

```
Elder's WhatsApp ⇄ Meta WhatsApp Cloud API ⇄ lively-bot (Python)
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                              Human Texting   OpenAI (LLM)   lively-backend
                              Engine (split/                 (BOT_SERVICE_KEY)
                              delay/typing)
```

Scheduler (🟡 pick Day 1 — APScheduler or a simple cron-style loop) drives: morning check-in (randomized 06:30–07:00 window), medicine reminders (per `medications.schedule_times`), and the `no_response` timeout check.

## 6. Non-goals
- No voice-note replies at MVP — incoming voice notes get transcribed (speech-to-text) so the companion replies in text, per the original design; the companion itself never sends voice. Full voice interaction is roadmap.
- No physiotherapist escalation, no camera-based movement checking — roadmap, per the original design's deliberate cuts.
- No additional companion personas or regional dialects beyond Mbak Asih / Mas Budi.
- No multi-caregiver alert routing logic in this repo — alerts are raised via `POST /alerts`; fan-out to multiple family members is `lively-backend`'s concern (see that repo's SPEC).

## 7. Risks & unknowns
- 🔴 Typing-indicator rendering on Meta WhatsApp Cloud API is unverified — this is the demo's central "magic moment." Test on a real phone Day 1 morning, before building anything else. Fallback: simulate rhythm through timed message-splitting alone if indicators don't render as expected.
- 🔴 WhatsApp Business/Cloud API setup friction (app review, test number provisioning) — start Day 1, not Day 2; this has the most external-dependency risk of any repo in the project.
- 🟡 Safety detection (pain/dizziness) relies on LLM judgment over free-form Indonesian text — false negatives are the failure mode that matters most here. Mitigate with both keyword triggers and LLM-assisted detection, not LLM alone.
- 🟡 Scheduler choice and reliability under a hackathon demo environment — keep it simple, test the exact demo-time trigger path Day 3.
- 🟢 OpenAI API integration itself is low-risk, well-documented.

## 8. Submission checklist (mapped to THIS event's deliverables)
- [ ] Working demo (bot reachable, at least one real WhatsApp conversation demoable live)
- [ ] Public repo with README, LICENSE, `.gitignore`, no committed secrets
- [ ] Pitch deck (🔴 TBD which repo hosts it)

**Doc sources:** none fetched — all facts above came directly from the user during drafting (2026-07-16).
