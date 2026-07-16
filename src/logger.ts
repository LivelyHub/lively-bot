import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
    : undefined,
});

export const baileysLogger = logger.child(
  { class: "baileys" },
  { level: process.env.BAILEYS_LOG_LEVEL ?? "warn" },
) as unknown as import("@whiskeysockets/baileys/lib/Utils/logger.js").ILogger;
