import { chat } from "./llmClient.js";
import { buildSystemPrompt, DEFAULT_ELDER_CONTEXT, type ElderContext } from "./soul/prompt.js";
import { toOpenAITools, runTool } from "./tools/index.js";
import { createMemoryStore, type ChatMessage } from "./memory/store.js";

const MAX_HISTORY = 20;
const MAX_TOOL_ROUNDS = 3;

const memory = createMemoryStore();

export async function reply(id: string, text: string, context: ElderContext = DEFAULT_ELDER_CONTEXT): Promise<string> {
  let history = await memory.getHistory(id);
  if (history.length === 0) {
    history = [{ role: "system", content: buildSystemPrompt(context) }];
  }
  history.push({ role: "user", content: text });

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

  await memory.setHistory(id, trimHistory(history));
  return answer;
}

/** Drops oldest turns once history grows past MAX_HISTORY, always cutting at a user-message
 * boundary so an assistant tool_calls message never gets separated from its tool results. */
function trimHistory(history: ChatMessage[]): ChatMessage[] {
  if (history.length <= MAX_HISTORY + 1) return history;
  const overflow = history.length - (MAX_HISTORY + 1);
  let cut = 1;
  while (cut < overflow + 1 && cut < history.length) {
    if (history[cut].role === "user") break;
    cut++;
  }
  return [history[0], ...history.slice(cut)];
}
