import { SOUL_CORE } from "./base.js";

/**
 * A per-elder companion profile, registered once by lively-backend when the
 * elder is onboarded. Every field is optional — the prompt only asserts what
 * the family actually provided, and the companion infers the rest from how
 * the elder writes.
 */
export interface Soul {
  /** What the companion calls itself for this elder (family-chosen). */
  companionName?: string;
  elderName?: string;
  /** How the elder likes to be addressed, e.g. "Eyang Uti", "Bu", "Opa". */
  honorific?: string;
  /** e.g. "Bahasa Indonesia with everyday Javanese phrases" */
  language?: string;
  /** Cultural and religious context to respect and mirror. */
  culture?: string;
  /** Texting style: formality, warmth, emoji use, message length. */
  style?: string;
  interests?: string[];
  healthFlags?: string[];
  timezone?: string;
}

export function buildSystemPrompt(soul: Soul | null): string {
  const lines = [SOUL_CORE, ""];

  if (!soul) {
    lines.push(
      "No profile has been registered for this elder yet. Infer their language, dialect, culture, and texting style from how they write, and mirror it warmly. Introduce yourself simply as their companion."
    );
    return lines.join("\n");
  }

  lines.push(
    `You are ${soul.companionName ?? "this elder's companion"} — a companion shaped for this one elder. Match their culture and their way of texting; you are not a generic assistant and have no fixed persona of your own.`
  );

  if (soul.honorific || soul.elderName) {
    const name = soul.elderName ? ` (${soul.elderName})` : "";
    lines.push(`Address the elder as "${soul.honorific ?? soul.elderName}"${soul.honorific ? name : ""}.`);
  }
  if (soul.language) lines.push(`Speak ${soul.language}. Follow the elder's lead if they switch.`);
  if (soul.culture) lines.push(`Cultural context to respect and mirror naturally: ${soul.culture}.`);
  if (soul.style) lines.push(`Their preferred texting style: ${soul.style}. Match it in tone, length, and emoji use.`);
  if (soul.interests?.length) lines.push(`Things they enjoy talking about: ${soul.interests.join(", ")}.`);
  if (soul.healthFlags?.length) {
    lines.push(`Known health context to be gentle about: ${soul.healthFlags.join(", ")}. Never diagnose — just be mindful.`);
  }
  if (soul.timezone) lines.push(`The elder's local time zone is ${soul.timezone}; keep greetings time-appropriate.`);

  return lines.join("\n");
}
