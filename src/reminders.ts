import { chat } from "./llmClient.js";
import { buildSystemPrompt } from "./soul/prompt.js";
import { loadPersonalize } from "./memory/personalize.js";
import { createMemoryStore, type Medication } from "./memory/store.js";
import { backendRequest } from "./tools/backend.js";
import { env } from "./config.js";
import { logger } from "./logger.js";

const CHECK_INTERVAL_MS = 60_000;
/** How long after the dose time a reminder is still worth sending. */
const LATE_WINDOW_MIN = 15;
const DEFAULT_TIMEZONE = "Asia/Jakarta";

const memory = createMemoryStore();

/**
 * Fires in-character medication reminders. The bot cannot reach the elder
 * directly — each due reminder is generated with the elder's soul + memory,
 * then handed to lively-backend (POST /bot/send) which owns WhatsApp delivery.
 */
export function startReminderScheduler(): void {
  if (!env.backendApiUrl) {
    logger.warn("BACKEND_API_URL not set — medication reminders disabled");
    return;
  }
  setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Reminder tick failed"));
  }, CHECK_INTERVAL_MS);
  logger.info("Medication reminder scheduler started");
}

async function tick(): Promise<void> {
  for (const elderId of memory.listEldersWithMedications()) {
    const soul = memory.getSoul(elderId);
    const tz = soul?.timezone ?? DEFAULT_TIMEZONE;
    const { dateKey, minutesNow } = localClock(tz);

    for (const med of memory.listMedications(elderId)) {
      for (const time of med.times) {
        const due = parseHHMM(time);
        if (due === null) continue;
        if (minutesNow < due || minutesNow - due > LATE_WINDOW_MIN) continue;

        const dueKey = `${dateKey} ${time}`;
        if (memory.wasReminded(elderId, med.id, dueKey)) continue;
        // Mark before sending so a slow/failed send can't double-remind;
        // a missed reminder is safer than a duplicate one.
        memory.markReminded(elderId, med.id, dueKey);

        try {
          await sendReminder(elderId, med, time);
        } catch (err) {
          logger.error({ err, elderId, medication: med.name }, "Failed to send medication reminder");
        }
      }
    }
  }
}

async function sendReminder(elderId: string, med: Medication, time: string): Promise<void> {
  const soul = memory.getSoul(elderId);
  const { summary } = memory.getRemembrance(elderId);

  let system = buildSystemPrompt(soul, loadPersonalize(elderId));
  if (summary) system += `\n\nWhat you remember about this elder from earlier conversations:\n${summary}`;

  const dose = med.dose ? ` (${med.dose})` : "";
  const message = await chat([
    { role: "system", content: system },
    {
      role: "user",
      content: `It is ${time}, time for the elder's medication: ${med.name}${dose} — ${med.schedule}. Write ONE short, warm reminder message to send them now. Just a gentle nudge in their language and style, no lecture, no emoji unless that is their style. Reply with only the message text.`,
    },
  ]);

  const text = message.content?.trim();
  if (!text) return;

  const result = await backendRequest("/bot/send", "POST", { elderId, text, kind: "medication_reminder" });
  if (!result.ok) {
    logger.error({ elderId, medication: med.name, status: result.status }, "Backend rejected reminder send");
    return;
  }

  // Keep the conversation coherent: the reminder becomes part of the elder's
  // history, so their next message ("sudah, barusan diminum") lands in context.
  const history = memory.getHistory(elderId);
  history.push({ role: "assistant", content: text });
  memory.setHistory(elderId, history);
  logger.info({ elderId, medication: med.name, time }, "Medication reminder sent");
}

function parseHHMM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function localClock(timeZone: string): { dateKey: string; minutesNow: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
  } catch {
    return localClock(DEFAULT_TIMEZONE); // invalid tz in a soul must not kill the scheduler
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    minutesNow: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}
