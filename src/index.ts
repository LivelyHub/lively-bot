import { createBotServer } from "./server.js";
import { startReminderScheduler } from "./reminders.js";
import { env } from "./config.js";
import { logger } from "./logger.js";

function main() {
  const server = createBotServer();
  server.listen(env.port, () => {
    logger.info({ port: env.port }, "Bot AI service listening");
  });
  startReminderScheduler();
}

main();
