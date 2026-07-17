# lively-bot <-> lively-backend — Remaining Work

Snapshot: 2026-07-17. Source of truth for schema/endpoints stays [CORE.md](CORE.md) (duplicated in both repos — update both if it changes).

## Status
- `lively-bot`: implemented, `/reply` working, tests pass. Small gaps below.
- `lively-backend`: docs only (CORE.md/PLAN.md/SPEC.md). No code yet. Everything below is new.

## Contract change already made in lively-bot (backend must match)

`POST /reply` now takes:
```json
{ "elderId": "string", "text": "string", "context": {
    "companion": "mbak_asih" | "mas_budi",
    "honorific": "string",
    "healthFlags": ["string"],
    "timezone": "string",
    "elderName": "string (optional)"
  }
}
```
`context` is optional (bot falls back to a default persona if omitted), but backend should always send it once elder setup exists — otherwise every elder gets the same default persona/honorific regardless of what's in their `elders` row.

**Backend action:** whichever handler calls `lively-bot`'s `/reply` (this will live inside `POST /bot/inbound`'s flow) must build `context` from the `elders` row before calling. CORE.md's endpoint table doesn't currently spell this out — add a line documenting it once implemented, in all four CORE.md copies.

## lively-bot — remaining gaps

1. **No timeout on outbound fetches.** `src/llmClient.ts` (OpenAI/OpenRouter calls) and `src/tools/backend.ts` (`backendRequest`) have no `AbortSignal.timeout(...)`. A stalled backend or OpenAI call hangs `/reply` indefinitely. Add a timeout (e.g. 10s) to both.
2. **Titipan relay tool not implemented.** `GET /bot/titipan` / `PATCH /titipan/:id` unused — no tool calls them. PLAN.md already marks this first-to-cut; skip unless time allows.
3. **No happy-path test.** `src/server.test.ts` only covers 400/404. Missing: valid `BOT_SERVICE_KEY` + tool-call round trip.

## lively-backend — everything (build order = demo-blocking first)

### 1. Schema (CORE.md §1)
11 tables on Neon Postgres: `household_accounts`, `elders`, `device_registrations`, `whatsapp_permissions`, `elder_consents`, `companions`, `conversations`, `chair_test_results`, `exercise_logs`, `medications`, `medication_logs`, `alerts`, `titipan_messages`.
Migration tool still 🟡 TBD (`node-pg-migrate` or Prisma) — pick one.
🔴 **Verify first:** Neon reachable from venue Wi-Fi. Untested risk flagged in backend's own SPEC.md §7. Fallback: local Postgres via Docker.

### 2. Auth
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` — household JWT, multiple device sessions coexist.
- Static-key gate (`BOT_SERVICE_KEY`) on all `/bot/*` routes — bot is a trusted service, never a user session.

### 3. Elder/device setup
- `POST /devices`, `DELETE /devices/:id`
- `POST /elders`, `GET /elders/:id`, `PATCH /elders/:id`
- `PATCH /elders/:id/whatsapp-permission` (attest/update/revoke platform messaging permission)
- `POST /elders/:id/consent/request` (request Lively product consent, only after valid platform permission)

### 4. Bot-facing routes (unblocks lively-bot integration)
- `POST /bot/consent` — record elder opt-in/withdrawal/pause, must come from WhatsApp with status+timestamp+source.
- `POST /bot/inbound` — log inbound text, fetch consent-gated elder context, call `lively-bot`'s `/reply` with `{elderId, text, context}` (see contract change above), relay reply back to WhatsApp send flow.
- `POST /bot/outbound` — log outbound text after send.
- `GET /bot/schedule` — due coaching/reminder/no-response work, scheduler owned entirely by backend.
- `POST /assessments/chair-test`, `POST /exercise-logs`, `POST /medication-logs`, `POST /alerts` — all called by bot's tool layer (`src/tools/definitions.ts` in lively-bot already targets these paths).
- `GET /bot/titipan`, `PATCH /titipan/:id` — skip if bot skips titipan tool (see gap 2 above).

### 5. Mobile-facing routes (not demo-blocking for bot, but in CORE.md scope)
- `GET /elders/:id/conversation`, `GET /elders/:id/progress`, `GET /elders/:id/medications`, `GET /elders/:id/alerts`
- `POST /medications`, `PATCH /medications/:id`, `PATCH /alerts/:id`, `POST /elders/:id/titipan`

### 6. Alert dispatch
- Persist alert on `POST /alerts` → push to every active token in `device_registrations` for that household account.
- Push provider still 🟡 TBD (SPEC.md §7) — pick before Day 2 ends, contract stays the same regardless of provider.

### 7. Consent gating (cross-cutting, not a single endpoint)
- Before product consent: only store setup/permission/consent state. No AI conversation, no scheduled coaching, no family chat visibility, no health-event sharing.
- Withdrawal/pause must stop scheduled coaching, reminders, conversation reads, event sharing until consent restored.
- `distress_message` alerts only from explicit elder text — never inferred from silence/media/sensors.

## Cut-order if time compresses (per both repos' PLAN.md)
1. Titipan relay (both repos)
2. Alert types beyond `pain_mention` / `distress_message`
3. Chair Stand parsing
Keep: `/reply` end to end, one persona, basic conversation memory, account/session, consent gates, medication logging, event-based alert dispatch — that's the cross-repo demo spine.
