import { SOUL_CORE } from "./base.js";
import { PERSONAS, type PersonaKey } from "./personas.js";

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

export interface ElderContext {
  companion: PersonaKey;
  honorific: string;
  healthFlags: string[];
  timezone: string;
  elderName?: string;
  personalize?: ElderPersonalize | null;
}

export const DEFAULT_ELDER_CONTEXT: ElderContext = {
  companion: "mbak_asih",
  honorific: "Bu",
  healthFlags: [],
  timezone: "Asia/Jakarta",
};

export function buildSystemPrompt(context: ElderContext): string {
  const persona = PERSONAS[context.companion];
  const lines = [SOUL_CORE, "", persona.voice, "", `Address the elder as "${context.honorific}"${context.elderName ? ` (${context.elderName})` : ""}.`];

  if (context.healthFlags.length > 0) {
    lines.push(`Known health context to be gentle about: ${context.healthFlags.join(", ")}. Never diagnose — just be mindful.`);
  }

  lines.push(`The elder's local time zone is ${context.timezone}; keep greetings time-appropriate.`);

  const p = context.personalize;
  if (p?.family?.length) {
    lines.push(`Family to ask about by name: ${p.family.map((f) => `${f.name} (${f.relation})`).join(", ")}.`);
  }
  if (p?.hobbies?.length) {
    lines.push(`Hobbies/interests: ${p.hobbies.join(", ")}.`);
  }
  if (p?.favorite_topics?.length) {
    lines.push(`Favorite topics to bring up: ${p.favorite_topics.join(", ")}.`);
  }
  if (p?.avoid_topics?.length) {
    lines.push(`Topics to avoid: ${p.avoid_topics.join(", ")}.`);
  }
  if (p?.speech_style) {
    lines.push(`Speech style notes: ${p.speech_style}.`);
  }

  return lines.join("\n");
}
