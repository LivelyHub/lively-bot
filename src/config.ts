import "dotenv/config";

export const env = {
  whatsappAuthDir: process.env.WHATSAPP_AUTH_DIR ?? "./auth",
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterModel: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free",
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  whatsappEnabled: process.env.WHATSAPP_ENABLED === "true",
  backendApiUrl: process.env.BACKEND_API_URL,
  botServiceKey: process.env.BOT_SERVICE_KEY,
  memoryDir: process.env.MEMORY_DIR ?? "./data/memory",
};
