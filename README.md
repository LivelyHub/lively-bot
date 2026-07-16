# lively-bot

> The WhatsApp companion itself: Mbak Asih and Mas Budi, texting Indonesian elders with human rhythm through text-only coaching, routine medication reminders, and explicit event signals for family follow-up.

**Status:** 📐 Pre-build spec. See [SPEC.md](SPEC.md), [PLAN.md](PLAN.md), and shared core [CORE.md](CORE.md).

| | |
|---|---|
| Hackathon | Garuda Hacks 7.0 |
| Submit by | 2026-07-18 · exact time 🔴 TBD · prize 🔴 TBD |
| Track | Health |
| Gate | Working demo + repo + pitch deck submitted |
| Stack | Python · Meta WhatsApp Cloud API · OpenAI |

Owns the Human Texting Engine, two companion prompts, Meta WhatsApp Cloud API webhook, text-only conversation flow, 30-second Chair Stand prompt, scheduled coaching/reminders, and event-based alert creation. Talks only to `lively-backend` using `BOT_SERVICE_KEY`. Never touches the DB directly.

## Notes

- Public repo. No secrets in source. Config uses env vars only. `.env.example` documents names; real values live in a gitignored `.env`.
- Part of a 4-repo Lively build (`lively-landing`, `lively-mobile`, `lively-backend`, `lively-bot`) sharing [CORE.md](CORE.md) verbatim.
- MVP is strictly WhatsApp text. Ordinary text links are allowed. Native photo/video/media workflows and voice transcription are outside MVP and outside stretch.

## License

MIT. See LICENSE.
