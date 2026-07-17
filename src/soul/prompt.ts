import { SOUL_CORE } from "./base.js";

// Mirrors lively-backend's ElderPersonalize (src/db/schema.ts) — free-form
// persona detail collected by mobile's profile-completion flow, forwarded
// verbatim so this repo doesn't need to interpret or validate its shape.
export interface ElderPersonalize {
  family?: { name: string; relation: string }[];
  hobbies?: string[];
  favorite_topics?: string[];
  avoid_topics?: string[];
  speech_style?: string;
}

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

export function buildSystemPrompt(soul: Soul | null, personalize?: ElderPersonalize | null): string {
  const lines = [SOUL_CORE, ""];

  if (!soul) {
    lines.push(
      "No profile has been registered for this elder yet. Infer their language, dialect, culture, and texting style from how they write, and mirror it warmly. Introduce yourself simply as their companion."
    );
  } else {
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
  }

  if (personalize?.family?.length) {
    lines.push(`Family to ask about by name: ${personalize.family.map((f) => `${f.name} (${f.relation})`).join(", ")}.`);
  }
  if (personalize?.hobbies?.length) {
    lines.push(`Hobbies/interests: ${personalize.hobbies.join(", ")}.`);
  }
  if (personalize?.favorite_topics?.length) {
    lines.push(`Favorite topics to bring up: ${personalize.favorite_topics.join(", ")}.`);
  }
  if (personalize?.avoid_topics?.length) {
    lines.push(`Topics to avoid: ${personalize.avoid_topics.join(", ")}.`);
  }
  if (personalize?.speech_style) {
    lines.push(`Speech style notes: ${personalize.speech_style}.`);
  }

  return lines.join("\n");
}
