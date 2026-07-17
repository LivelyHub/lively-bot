import { chat } from "./llmClient.js";
import { buildSystemPrompt, DEFAULT_ELDER_CONTEXT, type ElderContext } from "./soul/prompt.js";
import { toOpenAITools, runTool } from "./tools/index.js";
import { createMemoryStore, type ChatMessage } from "./memory/store.js";
import { archivableTurns, consolidate } from "./memory/remember.js";
import { logger } from "./logger.js";

const MAX_HISTORY = 20;
const MAX_TOOL_ROUNDS = 3;

const memory = createMemoryStore();

export async function reply(id: string, text: string, context: ElderContext = DEFAULT_ELDER_CONTEXT): Promise<string> {
  // The system prompt is rebuilt every turn (not stored) so it always carries the
  // current persona context and the latest long-term notes about this elder.
  const { summary } = memory.getRemembrance(id);
  const system = summary
    ? `${buildSystemPrompt(context)}\n\nWhat you remember about this elder from earlier conversations:\n${summary}`
    : buildSystemPrompt(context);

  const history: ChatMessage[] = [
    { role: "system", content: system },
    ...memory.getHistory(id),
    { role: "user", content: text },
  ];

  const toolCtx = { elderId: id };
  let answer = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const message = await chat(history, toOpenAITools());
    history.push(message as ChatMessage);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      answer = message.content ?? "";
      break;
    }

    for (const call of message.tool_calls) {
      const result = await runTool(call.function.name, call.function.arguments, toolCtx);
      history.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  const { kept, dropped } = trimHistory(history.slice(1));
  memory.setHistory(id, kept);

  if (dropped.length > 0) {
    memory.archiveTurns(id, archivableTurns(dropped));
    // Runs after the reply is on its way so it never adds latency to the conversation.
    void consolidate(memory, id).catch((err) => {
      logger.error({ err, id }, "Remembrance consolidation failed");
    });
  }

  return answer;
}

/** Drops oldest turns once history grows past MAX_HISTORY, always cutting at a user-message
 * boundary so an assistant tool_calls message never gets separated from its tool results. */
function trimHistory(history: ChatMessage[]): { kept: ChatMessage[]; dropped: ChatMessage[] } {
  if (history.length <= MAX_HISTORY) return { kept: history, dropped: [] };
  let cut = history.length - MAX_HISTORY;
  while (cut < history.length && history[cut].role !== "user") cut++;
  return { kept: history.slice(cut), dropped: history.slice(0, cut) };
}
