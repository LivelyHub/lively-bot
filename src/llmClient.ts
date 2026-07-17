import OpenAI from "openai";
import type { ChatCompletionMessage, ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { env } from "./config.js";
import { logger } from "./logger.js";

const primary = env.openaiApiKey
  ? new OpenAI({ apiKey: env.openaiApiKey, baseURL: env.openaiBaseUrl })
  : null;

const fallback = env.openrouterApiKey
  ? new OpenAI({ apiKey: env.openrouterApiKey, baseURL: env.openrouterBaseUrl })
  : null;

export async function chat(messages: ChatCompletionMessageParam[], tools?: ChatCompletionTool[]): Promise<ChatCompletionMessage> {
  if (primary) {
    try {
      const res = await primary.chat.completions.create({ model: env.openaiModel, messages, tools });
      return res.choices[0].message;
    } catch (err) {
      if (!fallback) throw err;
      logger.warn({ err }, "Primary LLM provider failed, falling back to OpenRouter");
    }
  }
  if (!fallback) throw new Error("No LLM provider configured (set OPENAI_API_KEY or OPENROUTER_API_KEY)");
  const res = await fallback.chat.completions.create({ model: env.openrouterModel, messages, tools });
  return res.choices[0].message;
}
