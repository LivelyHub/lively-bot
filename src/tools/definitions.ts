import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { backendRequest } from "./backend.js";

export interface ToolContext {
  elderId: string;
}

export interface ToolDefinition {
  schema: ChatCompletionTool;
  handler: (args: any, ctx: ToolContext) => Promise<unknown>;
}

const ALERT_TYPES = ["missed_days", "pain_mention", "dizziness_mention", "medication_missed", "no_response", "distress_message"] as const;

export const TOOLS: ToolDefinition[] = [
  {
    schema: {
      type: "function",
      function: {
        name: "log_exercise_completion",
        description: "Record that the elder completed their daily exercise, based on what they told you in chat.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    handler: async (_args, ctx) => backendRequest("/exercise-logs", "POST", { elderId: ctx.elderId, method: "text" }),
  },
  {
    schema: {
      type: "function",
      function: {
        name: "log_medication_confirmation",
        description: "Record that the elder confirmed taking (or missed) a scheduled medication dose, based on what they told you in chat.",
        parameters: {
          type: "object",
          properties: {
            medicationId: { type: "string", description: "The medication's id, if known from context." },
            status: { type: "string", enum: ["confirmed", "missed"] },
          },
          required: ["status"],
        },
      },
    },
    handler: async (args, ctx) =>
      backendRequest("/medication-logs", "POST", {
        elderId: ctx.elderId,
        medicationId: args.medicationId,
        status: args.status,
        method: "text",
      }),
  },
  {
    schema: {
      type: "function",
      function: {
        name: "log_chair_stand_result",
        description: "Record the elder's 30-second Chair Stand repetition count once they've reported it in chat.",
        parameters: {
          type: "object",
          properties: {
            reps: { type: "number", description: "Number of repetitions completed in 30 seconds." },
          },
          required: ["reps"],
        },
      },
    },
    handler: async (args, ctx) =>
      backendRequest("/assessments/chair-test", "POST", { elderId: ctx.elderId, reps: args.reps, source: "chat" }),
  },
  {
    schema: {
      type: "function",
      function: {
        name: "create_alert",
        description:
          "Flag something the elder said to their family for follow-up. Use this for pain, dizziness, missed days, missed medication, or explicit distress — never for routine chat.",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: [...ALERT_TYPES] },
            note: { type: "string", description: "Short plain-language note on what the elder said." },
          },
          required: ["type", "note"],
        },
      },
    },
    handler: async (args, ctx) =>
      backendRequest("/alerts", "POST", { elderId: ctx.elderId, type: args.type, payload: { note: args.note } }),
  },
];

export function findTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.schema.function.name === name);
}
