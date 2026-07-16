# lively-bot

> The WhatsApp companion itself — Mbak Asih and Mas Budi, texting Indonesian elders with human rhythm: daily exercise coaching, medicine reminders, and safety check-ins.

**Status:** 📐 Pre-build spec — see [SPEC.md](SPEC.md) and [PLAN.md](PLAN.md). Shared core: [CORE.md](CORE.md).

| | |
|---|---|
| Hackathon | Garuda Hacks 7.0 |
| Submit by | 2026-07-18 · exact time 🔴 TBD · prize 🔴 TBD |
| Track | Health |
| Gate | Working demo + repo + pitch deck submitted |
| Stack | Python · Meta WhatsApp Cloud API · OpenAI |

Owns the Human Texting Engine (typing indicators, message splitting, natural pacing), the two companion personas' system prompts, the 30-second chair-test conversation flow, medicine reminders, and safety-alert detection. Talks only to `lively-backend` — never touches the DB directly. See [CORE.md](CORE.md) for the full contract.

## Notes

- Public repo. No secrets in source — config via env vars only (`.env.example` documents names; real values live in a gitignored `.env`).
- Part of a 4-repo Lively build (`lively-landing`, `lively-mobile`, `lively-backend`, `lively-bot`) sharing [CORE.md](CORE.md) verbatim.

## License

MIT — see LICENSE.
