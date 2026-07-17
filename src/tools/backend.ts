import { env } from "../config.js";
import { logger } from "../logger.js";

export interface BackendResult {
  ok: boolean;
  status?: number;
  body?: unknown;
  stubbed?: boolean;
}

export async function backendRequest(path: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<BackendResult> {
  if (!env.backendApiUrl) {
    logger.warn({ path, method }, "BACKEND_API_URL not set — skipping backend call, tool ran as a stub");
    return { ok: false, stubbed: true };
  }

  try {
    const res = await fetch(new URL(path, env.backendApiUrl), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(env.botServiceKey ? { Authorization: `Bearer ${env.botServiceKey}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseBody = await res.json().catch(() => undefined);
    if (!res.ok) {
      logger.error({ path, method, status: res.status, responseBody }, "Backend call failed");
    }
    return { ok: res.ok, status: res.status, body: responseBody };
  } catch (err) {
    logger.error({ err, path, method }, "Backend call threw");
    return { ok: false };
  }
}
