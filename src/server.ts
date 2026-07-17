import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { reply } from "./companion.js";
import { createMemoryStore, type MedicationInput } from "./memory/store.js";
import type { Soul, ElderPersonalize } from "./soul/prompt.js";
import { env } from "./config.js";
import { logger } from "./logger.js";

interface ReplyRequest {
  elderId: string;
  text: string;
  personalize?: ElderPersonalize | null;
}

interface SoulRequest {
  elderId: string;
  soul: Soul;
}

const memory = createMemoryStore();

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createBotServer() {
  return createServer(async (req, res) => {
    if (req.method !== "POST" || (req.url !== "/reply" && req.url !== "/soul" && req.url !== "/medications")) {
      send(res, 404, { error: "not found" });
      return;
    }

    if (env.botServiceKey && req.headers.authorization !== `Bearer ${env.botServiceKey}`) {
      send(res, 401, { error: "unauthorized" });
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      send(res, 400, { error: "invalid json" });
      return;
    }

    // One-time registration: backend sends the elder's companion profile once
    // at onboarding; it persists in SQLite and shapes every future reply.
    if (req.url === "/soul") {
      const { elderId, soul } = payload as SoulRequest;
      if (!elderId || typeof soul !== "object" || soul === null || Array.isArray(soul)) {
        send(res, 400, { error: "elderId and soul object are required" });
        return;
      }
      memory.setSoul(elderId, soul);
      logger.info({ elderId }, "Soul registered for elder");
      send(res, 200, { ok: true });
      return;
    }

    // Backend sync: replaces the elder's whole tracked schedule. The model can
    // still adjust it from chat via the add_medication / stop_medication tools.
    if (req.url === "/medications") {
      const { elderId, medications } = payload as { elderId: string; medications: MedicationInput[] };
      const valid =
        Array.isArray(medications) &&
        medications.every(
          (m) =>
            m &&
            typeof m.name === "string" &&
            m.name &&
            typeof m.schedule === "string" &&
            m.schedule &&
            (m.times === undefined || (Array.isArray(m.times) && m.times.every((t) => typeof t === "string")))
        );
      if (!elderId || !valid) {
        send(res, 400, { error: "elderId and medications[] with name and schedule are required" });
        return;
      }
      memory.replaceMedications(elderId, medications);
      logger.info({ elderId, count: medications.length }, "Medication schedule synced for elder");
      send(res, 200, { ok: true, count: medications.length });
      return;
    }

    const { elderId, text, personalize } = payload as ReplyRequest;
    if (!elderId || !text) {
      send(res, 400, { error: "elderId and text are required" });
      return;
    }

    try {
      const answer = await reply(elderId, text, personalize);
      send(res, 200, { reply: answer });
    } catch (err) {
      logger.error({ err, elderId }, "Failed to generate reply");
      send(res, 500, { error: "internal error" });
    }
  });
}
