import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { TOOLS, findTool, type ToolContext } from "./definitions.js";
import { logger } from "../logger.js";

export type { ToolContext } from "./definitions.js";

export function toOpenAITools(): ChatCompletionTool[] {
  return TOOLS.map((t) => t.schema);
}

export async function runTool(name: string, argsJson: string, ctx: ToolContext): Promise<string> {
  const tool = findTool(name);
  if (!tool) {
    logger.warn({ name }, "Model requested unknown tool");
    return JSON.stringify({ ok: false, error: `unknown tool: ${name}` });
  }

  let args: unknown = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch (err) {
    logger.warn({ err, name, argsJson }, "Failed to parse tool arguments");
  }

  try {
    const result = await tool.handler(args, ctx);
    return JSON.stringify(result);
  } catch (err) {
    logger.error({ err, name }, "Tool handler threw");
    return JSON.stringify({ ok: false, error: "tool execution failed" });
  }
}
