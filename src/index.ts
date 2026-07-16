import { createWhatsAppSocket } from "./whatsapp/client.js";
import { registerInboundHandler } from "./whatsapp/inbound.js";
import { logger } from "./logger.js";

async function main() {
  const socket = await createWhatsAppSocket();
  registerInboundHandler(socket);
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error during startup");
  process.exit(1);
});
