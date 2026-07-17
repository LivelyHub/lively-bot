import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { reply } from "./companion.js";
import { env } from "./config.js";
import { logger } from "./logger.js";

interface ReplyRequest {
  elderId: string;
  text: string;
}

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
    if (req.method !== "POST" || req.url !== "/reply") {
      send(res, 404, { error: "not found" });
      return;
    }

    if (env.botServiceKey && req.headers.authorization !== `Bearer ${env.botServiceKey}`) {
      send(res, 401, { error: "unauthorized" });
      return;
    }

    let payload: ReplyRequest;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      send(res, 400, { error: "invalid json" });
      return;
    }

    if (!payload.elderId || !payload.text) {
      send(res, 400, { error: "elderId and text are required" });
      return;
    }

    try {
      const answer = await reply(payload.elderId, payload.text);
      send(res, 200, { reply: answer });
    } catch (err) {
      logger.error({ err, elderId: payload.elderId }, "Failed to generate reply");
      send(res, 500, { error: "internal error" });
    }
  });
}
