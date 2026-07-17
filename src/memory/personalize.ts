import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "../config.js";
import { logger } from "../logger.js";
import type { ElderPersonalize } from "../soul/prompt.js";

// Per-elder JSON cache so backend doesn't have to resend `personalize` on
// every /reply call — first call with it present writes the file, later
// calls that omit it (or omit context entirely) still get it merged in.
const DIR = join(dirname(env.databasePath), "personalize");

function filePath(elderId: string): string {
  return join(DIR, `${elderId}.json`);
}

export function loadPersonalize(elderId: string): ElderPersonalize | null {
  const path = filePath(elderId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ElderPersonalize;
  } catch (err) {
    logger.error({ err, elderId }, "Corrupt personalize cache, ignoring");
    return null;
  }
}

export function savePersonalize(elderId: string, data: ElderPersonalize): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(filePath(elderId), JSON.stringify(data));
}
