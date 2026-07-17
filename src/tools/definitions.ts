import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { backendRequest } from "./backend.js";
import { createMemoryStore } from "../memory/store.js";

const memory = createMemoryStore();

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
        name: "add_medication",
        description:
          "Record a medication and its schedule that the elder (or their family) mentioned in chat, so you can gently ask about doses at the right times. Use only for schedules they tell you — never invent or prescribe one.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Medication name as the elder calls it." },
            dose: { type: "string", description: "Dose if mentioned, e.g. '1 tablet 5mg'." },
            schedule: { type: "string", description: "When they take it, in their own words, e.g. 'pagi jam 7 dan malam setelah makan'." },
            notes: { type: "string", description: "Anything else relevant, e.g. 'from Dr. Sari, for blood pressure'." },
          },
          required: ["name", "schedule"],
        },
      },
    },
    handler: async (args, ctx) => {
      const id = memory.addMedication(ctx.elderId, {
        name: args.name,
        dose: args.dose,
        schedule: args.schedule,
        notes: args.notes,
      });
      return { ok: true, medicationId: id };
    },
  },
  {
    schema: {
      type: "function",
      function: {
        name: "stop_medication",
        description:
          "Mark a tracked medication as no longer taken, when the elder says they stopped it or the doctor changed it. To change a schedule, stop the old entry and add the new one.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the medication to stop tracking." },
          },
          required: ["name"],
        },
      },
    },
    handler: async (args, ctx) => {
      const stopped = memory.stopMedication(ctx.elderId, args.name);
      return stopped > 0 ? { ok: true } : { ok: false, error: "no active medication with that name" };
    },
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
