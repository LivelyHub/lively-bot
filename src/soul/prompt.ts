import { SOUL_CORE } from "./base.js";
import { PERSONAS, type PersonaKey } from "./personas.js";

export interface ElderContext {
  companion: PersonaKey;
  honorific: string;
  healthFlags: string[];
  timezone: string;
  elderName?: string;
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

  return lines.join("\n");
}
