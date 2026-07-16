# CORE - Lively Shared Data & API Layer

> This doc is duplicated verbatim across all four Lively repos: `lively-landing`, `lively-mobile`, `lively-backend`, `lively-bot`. `lively-backend` is the canonical source of truth because it owns the schema, auth contract, API, alert persistence, and push dispatch. If this changes, update all four copies.

Lively has one shared foundation underneath four surfaces: a marketing site, a family-facing mobile app, a REST/data backend, and a WhatsApp companion bot. All four agree on one account model, one elder profile, one platform messaging gate, one product consent gate, one event-based alert path, and one API contract served by `lively-backend`. The landing page is mostly static and does not call the API at MVP.

## What the core provides

**Provides:**
- Postgres (Neon) schema for household accounts, one-to-one elder profiles, device registrations, platform messaging permission, product consent, companions, conversations, Chair Stand results, exercise logs, medications, medication logs, alerts, and titipan messages.
- REST API (Fastify, `lively-backend`) that `lively-mobile` and `lively-bot` both call. Neither repo talks to the DB directly.
- Account model: one shared household account per elder. Multiple family members may use the same login on multiple devices. This is not separate family identities, invitations, profiles, or fan-out by separate family account.
- Device registration model: active push tokens live in `device_registrations`. Backend dispatches each persisted alert to all active device tokens for the shared household account. Logout or revocation deactivates that device token without deleting the account.
- Auth model: mobile uses household-account sessions/JWT from the backend. Multiple device sessions may coexist. Bot uses `BOT_SERVICE_KEY` as a trusted service, never as a user session.
- Consent model: platform messaging permission and Lively product consent are separate prerequisites. A family can request product consent only after valid WhatsApp/business messaging permission exists. The elder must explicitly give Lively product consent in WhatsApp before AI conversation, scheduled coaching/reminders, family chat visibility, or health-related event sharing starts.
- Companion persona contract: two fixed personas, Mbak Asih and Mas Budi, parameterized by honorific and health flags.
- Human Texting Engine contract: text-only WhatsApp message splitting, pacing, and best-effort typing indicator behavior.
- Medication reminder contract: routine reminder and confirmation logging only.
- Event-based alert contract: backend persists alerts and owns push dispatch; mobile registers devices, receives/displays push, and shows the Alerts UI.

**Does NOT provide:** UI/UX, actual LLM prompt text, WhatsApp webhook handling, page design, native media workflows, clinical guidance, legal compliance claims, or continuous monitoring. A repo implements these interfaces; it does not fork them. Needing a new field or endpoint means changing this doc in all four repos.

## Details

### 1. Data model - Postgres on Neon

```
household_accounts (id, email, password_hash, created_at)
elders             (id, household_account_id UNIQUE, name, honorific, companion_id, health_flags[], phone_e164, timezone, paused_at, created_at)
device_registrations(id, household_account_id, platform, push_token, active, revoked_at, created_at, last_seen_at)
whatsapp_permissions(id, elder_id, status['unknown'|'permitted'|'revoked'], source, attested_at, updated_at)
elder_consents     (id, elder_id, status['pending'|'opted_in'|'withdrawn'|'paused'], source['whatsapp'], consented_at, withdrawn_at, updated_at)
companions         (id, key['mbak_asih'|'mas_budi'], display_name, system_prompt_ref)
conversations      (id, elder_id, direction['in'|'out'], body, created_at)
chair_test_results (id, elder_id, reps, recorded_at, source['chat'])
exercise_logs      (id, elder_id, completed_at, method['text'])
medications        (id, elder_id, name, dosage_label, schedule_times[], timezone, missed_threshold, active, deactivated_at, created_at, updated_at)
medication_logs    (id, medication_id, elder_id, status['confirmed'|'missed'], logged_at, method['text'])
alerts             (id, elder_id, type['missed_days'|'pain_mention'|'dizziness_mention'|'medication_missed'|'no_response'|'distress_message'], payload, created_at, resolved_at)
titipan_messages   (id, elder_id, household_account_id, body, status['queued'|'delivered'|'failed'], delivered_at, created_at)
```

### 2. API contract (Fastify, `lively-backend`)

| Endpoint | Consumer | Purpose |
|---|---|---|
| `POST /auth/register` | mobile | create the shared household account for one elder |
| `POST /auth/login` | mobile | create a household-account session/JWT |
| `POST /auth/logout` | mobile | revoke the current device registration/session |
| `POST /devices` | mobile | register or refresh this device's active push token |
| `DELETE /devices/:id` | mobile | deactivate a push token on logout or revocation |
| `POST /elders` | mobile | create the one-to-one elder profile for the household account, companion, honorific, timezone, health flags |
| `GET /elders/:id` | mobile, bot | read elder setup and consent-gated companion context |
| `PATCH /elders/:id` | mobile | switch companion, honorific, health flags, timezone, or pause state |
| `PATCH /elders/:id/whatsapp-permission` | mobile | record, update, or revoke the household attestation that valid WhatsApp/business messaging permission exists, with status, source, and timestamp |
| `POST /elders/:id/consent/request` | mobile | request Lively product consent after platform messaging permission exists |
| `POST /bot/consent` | bot | record elder opt-in, withdrawal, or pause from WhatsApp |
| `GET /elders/:id/conversation` | mobile | read chat monitor only after elder opt-in |
| `POST /bot/inbound` | bot | log inbound WhatsApp text and fetch context if consent allows |
| `POST /bot/outbound` | bot | log outbound WhatsApp text after send |
| `GET /elders/:id/progress` | mobile | read exercise history and Chair Stand history |
| `POST /assessments/chair-test` | bot | record parsed 30-second Chair Stand repetitions |
| `POST /exercise-logs` | bot | record text-confirmed daily exercise completion |
| `GET /elders/:id/medications` | mobile, bot | read active medication schedules and recent logs |
| `POST /medications` | mobile | add routine medication name, dosage label, schedule, timezone, threshold |
| `PATCH /medications/:id` | mobile | update schedule fields or deactivate a medication |
| `POST /medication-logs` | bot | record text-confirmed or missed scheduled dose status |
| `GET /elders/:id/alerts` | mobile | read alerts for the Alerts UI |
| `POST /alerts` | bot | create an event-based alert; backend stores and dispatches push |
| `PATCH /alerts/:id` | mobile | mark an alert resolved |
| `GET /bot/schedule` | bot | read due coaching, reminder, and no-response work owned by Lively's scheduler |
| `POST /elders/:id/titipan` | mobile | queue a family message for companion relay |
| `GET /bot/titipan` | bot | fetch queued titipan messages |
| `PATCH /titipan/:id` | bot | mark titipan delivered or failed |

Auth: mobile uses household-account JWT. Bot uses `BOT_SERVICE_KEY`. Landing uses no auth at MVP.

### 3. Platform messaging permission and product consent

- Platform messaging permission is the WhatsApp/business prerequisite for business-initiated outreach. Family setup must not imply Lively can cold-message a phone number without valid platform permission.
- Mobile records this as household attestation through `PATCH /elders/:id/whatsapp-permission`, with status, source, and timestamp. This is MVP product state for outreach gating, not a claim that Lively independently verifies legal compliance.
- Revoked platform permission blocks future business-initiated outreach and blocks product-consent request templates until permission is recorded again.
- Once platform messaging permission exists, Lively may send the first approved template asking for Lively product consent.
- Platform messaging permission is not Lively product consent. It does not enable AI conversation, scheduled coaching/reminders, family chat visibility, or health-related event sharing.
- Lively product consent is separate. The elder must explicitly consent in WhatsApp through `POST /bot/consent` before AI conversation, scheduled coaching/reminders, family chat visibility, or health-related event sharing starts.
- Before Lively product consent, backend stores only setup data and permission/consent state needed to operate the account and request consent. Family chat visibility, scheduled coaching/reminders, health-related event sharing, and AI conversation stay off.
- Elder consent, withdrawal, or pause must arrive from WhatsApp and be persisted with status, timestamp, and source. Withdrawal or pause stops scheduled coaching, reminders, conversation reads, and event sharing until consent is restored.
- No legal compliance claim is made here. This is the product contract for MVP behavior.

### 4. Companion persona contract

```ts
interface CompanionConfig {
  key: "mbak_asih" | "mas_budi";
  honorific: string;
  healthFlags: string[];
  timezone: string;
}
```

The system prompt text lives in `lively-bot`. The shared interface is only the data both backend and bot need to agree on.

### 5. Human Texting Engine and WhatsApp constraints

- MVP WhatsApp interaction is text-only. Ordinary text links are allowed. There is no native video, photo, image upload, or media confirmation workflow.
- Voice note ingestion and transcription are roadmap-only. They are outside MVP and outside the stretch plan.
- Typing indicator is tied to the inbound-response flow and best-effort. If unavailable, the bot falls back to conservative pacing and split messages.
- Business-initiated messages, including first contact and reminders outside WhatsApp's 24-hour customer service window, require valid platform messaging permission and approved templates.
- Lively owns the scheduler for check-ins, medication reminders, and no-response checks.
- Split-message request order is not guaranteed by the platform. Sequence conservatively, wait for delivery where practical, and pace messages even when typing indicator is unavailable.

### 6. Medication reminder contract

- Medication scope is name, dosage label, schedule times, timezone, reminder send, text confirmation log, and missed threshold.
- Family can update schedule fields or deactivate a medication. Deactivation stops future reminders and keeps history.
- Text confirmation such as "sudah minum obat" records a `medication_logs` row. Photos, voice notes, and pill images are not accepted as log methods in MVP.
- Lively does not check medical correctness, change doses, advise on missed doses, check interactions, or provide clinical guidance.

### 7. Progress and Chair Stand contract

- Chair Stand is a 30-second progress check of repetitions in a lower-body strength and endurance context.
- It is not a diagnosis, clinical assessment, or standalone determination of health status.
- Mobile reads exercise history and Chair Stand history through `GET /elders/:id/progress`.

### 8. Event-based alert contract

- Alerts are event-based signals that require family follow-up. They are not verified emergencies and not continuous monitoring.
- Allowed alert types: `missed_days`, `pain_mention`, `dizziness_mention`, `medication_missed`, `no_response`, `distress_message`.
- `distress_message` can only come from explicit text the elder sends. The bot does not infer it from silence, media, sensors, or background monitoring.
- Backend owns alert persistence and push dispatch. For each new alert, backend sends push to every active token in `device_registrations` for the shared household account.
- Mobile owns device registration, push receipt/display, Alerts UI, and alert resolution.

## Config and secrets

- All secrets use env vars and are never committed. Ship `.env.example` with names only.
- Shared names: `DATABASE_URL`, `BOT_SERVICE_KEY`, `BACKEND_API_URL`, `JWT_SECRET`.
- Repo-specific vars, such as WhatsApp tokens, OpenAI key, backend push-provider credentials, and client app identifiers, live in each repo's `.env.example` by name only.

## Build status

🟡 Design doc, not yet implemented. This is Day 1 of Garuda Hacks 7.0 (2026-07-16). Schema and endpoints above are the target shape for the hackathon build, not a published package. If the schema drifts during implementation, update this file in all four repos before continuing.
