import "dotenv/config";

function parsePort(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback;
}

export const env = {
  port: parsePort(process.env.PORT, 7002),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterModel: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free",
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  backendApiUrl: process.env.BACKEND_API_URL,
  botServiceKey: process.env.BOT_SERVICE_KEY,
  databasePath: process.env.DATABASE_PATH ?? "./data/lively.db",
};
