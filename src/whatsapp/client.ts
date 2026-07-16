import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { env } from "../config.js";
import { logger, baileysLogger } from "../logger.js";

const MAX_RECONNECT_DELAY_MS = 30_000;
let reconnectAttempts = 0;

export async function createWhatsAppSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(env.whatsappAuthDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info({ version, isLatest }, "Using WA web version");
  const socket = makeWASocket({ auth: state, logger: baileysLogger, version });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      logger.info("Scan this QR code with WhatsApp (Linked Devices) to log in:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      reconnectAttempts = 0;
      logger.info("WhatsApp connection open");
    } else if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden;
      logger.warn({ statusCode, shouldReconnect }, "WhatsApp connection closed");
      if (shouldReconnect) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY_MS);
        reconnectAttempts++;
        logger.info({ delay, attempt: reconnectAttempts }, "Reconnecting to WhatsApp");
        setTimeout(() => createWhatsAppSocket(), delay);
      } else {
        logger.error({ statusCode }, "Not reconnecting: session logged out or forbidden by WhatsApp");
      }
    }
  });

  return socket;
}
