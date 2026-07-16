import type { WASocket } from "@whiskeysockets/baileys";
import { sendHumanPaced } from "../texting.js";
import { chat } from "../llmClient.js";
import { logger } from "../logger.js";

const SYSTEM_PROMPT = "You are a warm, concise WhatsApp companion. Keep replies short.";
const MAX_HISTORY = 20;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const histories = new Map<string, ChatMessage[]>();

function getHistory(jid: string): ChatMessage[] {
  let history = histories.get(jid);
  if (!history) {
    history = [{ role: "system", content: SYSTEM_PROMPT }];
    histories.set(jid, history);
  }
  return history;
}

export function registerInboundHandler(socket: WASocket) {
  socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;
      const jid = msg.key.remoteJid;
      const text = msg.message.conversation ?? msg.message.extendedTextMessage?.text;
      if (!jid || !text) continue;
      logger.debug({ jid }, "Inbound message received");
      try {
        const history = getHistory(jid);
        history.push({ role: "user", content: text });
        const reply = await chat(history);
        history.push({ role: "assistant", content: reply });
        if (history.length > MAX_HISTORY + 1) history.splice(1, history.length - (MAX_HISTORY + 1));
        await sendHumanPaced(socket, jid, reply);
      } catch (err) {
        logger.error({ err, jid }, "Failed to send reply");
      }
    }
  });
}
