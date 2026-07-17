import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../config.js";
import { logger } from "../logger.js";

export type ChatMessage = ChatCompletionMessageParam;

export interface MemoryStore {
  getHistory(id: string): Promise<ChatMessage[]>;
  setHistory(id: string, history: ChatMessage[]): Promise<void>;
  reset(id: string): Promise<void>;
}

function safeFileName(id: string): string {
  return `${Buffer.from(id).toString("base64url")}.json`;
}

class FileMemoryStore implements MemoryStore {
  private cache = new Map<string, ChatMessage[]>();
  private ready: Promise<void>;

  constructor(private dir: string) {
    this.ready = mkdir(dir, { recursive: true }).then(() => undefined);
  }

  private filePath(id: string): string {
    return path.join(this.dir, safeFileName(id));
  }

  async getHistory(id: string): Promise<ChatMessage[]> {
    await this.ready;
    const cached = this.cache.get(id);
    if (cached) return cached;

    try {
      const raw = await readFile(this.filePath(id), "utf-8");
      const history = JSON.parse(raw) as ChatMessage[];
      this.cache.set(id, history);
      return history;
    } catch {
      return [];
    }
  }

  async setHistory(id: string, history: ChatMessage[]): Promise<void> {
    await this.ready;
    this.cache.set(id, history);
    try {
      await writeFile(this.filePath(id), JSON.stringify(history), "utf-8");
    } catch (err) {
      logger.error({ err, id }, "Failed to persist conversation memory to disk");
    }
  }

  async reset(id: string): Promise<void> {
    await this.ready;
    this.cache.delete(id);
    try {
      await writeFile(this.filePath(id), "[]", "utf-8");
    } catch (err) {
      logger.error({ err, id }, "Failed to clear conversation memory on disk");
    }
  }
}

export function createMemoryStore(): MemoryStore {
  return new FileMemoryStore(env.memoryDir);
}
