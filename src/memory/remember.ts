import { chat } from "../llmClient.js";
import { logger } from "../logger.js";
import type { ChatMessage, MemoryStore } from "./store.js";

/** Consolidate once this many turns have aged out of the live window unsummarized. */
const CONSOLIDATE_BATCH = 12;

const REMEMBER_INSTRUCTIONS = `You maintain long-term memory notes about one elderly person, written for their chat companion.
Merge the current notes with the new conversation excerpt into one updated set of notes.
Keep durable facts: name, family, health mentions, medications and routines, preferences, ongoing situations, plans, important dates.
When a new fact contradicts an old one, replace the old one. Drop greetings and small talk.
Write in short plain sentences, under 300 words. Reply with only the notes, nothing else.`;

/** Plain user/assistant text turns worth remembering; tool calls and tool results are dropped. */
export function archivableTurns(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()) {
      turns.push({ role: m.role, content: m.content });
    }
  }
  return turns;
}

/**
 * Folds archived turns into the elder's long-term notes once enough have accumulated.
 * Merges into the existing notes (never rewrites from scratch) so old facts are carried
 * forward, and only advances the watermark after a successful update — a failed LLM call
 * simply retries on a later turn.
 */
export async function consolidate(store: MemoryStore, id: string): Promise<void> {
  const pending = store.getPendingArchive(id);
  if (pending.length < CONSOLIDATE_BATCH) return;

  const { summary } = store.getRemembrance(id);
  const transcript = pending
    .map((t) => `${t.role === "user" ? "Elder" : "Companion"}: ${t.content}`)
    .join("\n");

  const message = await chat([
    { role: "system", content: REMEMBER_INSTRUCTIONS },
    {
      role: "user",
      content: `Current notes:\n${summary || "(none yet)"}\n\nNew conversation excerpt:\n${transcript}`,
    },
  ]);

  const updated = message.content?.trim();
  if (updated) {
    store.setRemembrance(id, updated, pending[pending.length - 1].id);
    logger.debug({ id, turns: pending.length }, "Remembrance consolidated");
  }
}
