import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../config.js";
import { logger } from "../logger.js";
import type { Soul } from "../soul/prompt.js";

export type ChatMessage = ChatCompletionMessageParam;

/** A plain-text turn that aged out of the live window, awaiting consolidation. */
export type ArchivedTurn = { id: number; role: "user" | "assistant"; content: string };

export type Remembrance = { summary: string; lastArchiveId: number };

export type Medication = {
  id: number;
  name: string;
  dose: string | null;
  /** Free-text schedule, e.g. "07:00 and 19:00, after meals". */
  schedule: string;
  notes: string | null;
};

export type MedicationInput = { name: string; dose?: string; schedule: string; notes?: string };

export interface MemoryStore {
  /** Live conversation window (never includes the system message). */
  getHistory(id: string): ChatMessage[];
  setHistory(id: string, history: ChatMessage[]): void;
  /** Clears the live window; long-term remembrance is kept. */
  reset(id: string): void;

  /** Store plain turns that fell out of the live window. */
  archiveTurns(id: string, turns: { role: "user" | "assistant"; content: string }[]): void;
  /** Archived turns not yet folded into the remembrance summary, oldest first. */
  getPendingArchive(id: string): ArchivedTurn[];

  getRemembrance(id: string): Remembrance;
  setRemembrance(id: string, summary: string, lastArchiveId: number): void;

  /** Per-elder companion profile, registered once by the backend at onboarding. */
  getSoul(id: string): Soul | null;
  setSoul(id: string, soul: Soul): void;

  /** Active medication schedule for one elder. */
  listMedications(id: string): Medication[];
  addMedication(id: string, med: MedicationInput): number;
  /** Deactivates by name (case-insensitive); returns how many were stopped. */
  stopMedication(id: string, name: string): number;
  /** Replaces the elder's whole schedule (backend sync at registration/update). */
  replaceMedications(id: string, meds: MedicationInput[]): void;
}

class SqliteMemoryStore implements MemoryStore {
  private db: Database.Database;
  private stmts;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS histories (
        elder_id TEXT PRIMARY KEY,
        history TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS archive (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        elder_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_archive_elder ON archive (elder_id, id);

      CREATE TABLE IF NOT EXISTS remembrances (
        elder_id TEXT PRIMARY KEY,
        summary TEXT NOT NULL DEFAULT '',
        last_archive_id INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS souls (
        elder_id TEXT PRIMARY KEY,
        soul TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        elder_id TEXT NOT NULL,
        name TEXT NOT NULL,
        dose TEXT,
        schedule TEXT NOT NULL,
        notes TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_medications_elder ON medications (elder_id, active);
    `);

    this.stmts = {
      getHistory: this.db.prepare("SELECT history FROM histories WHERE elder_id = ?"),
      setHistory: this.db.prepare(`
        INSERT INTO histories (elder_id, history, updated_at)
        VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT (elder_id) DO UPDATE SET history = excluded.history, updated_at = excluded.updated_at
      `),
      deleteHistory: this.db.prepare("DELETE FROM histories WHERE elder_id = ?"),
      insertArchive: this.db.prepare("INSERT INTO archive (elder_id, role, content) VALUES (?, ?, ?)"),
      pendingArchive: this.db.prepare(`
        SELECT a.id, a.role, a.content FROM archive a
        WHERE a.elder_id = ?
          AND a.id > COALESCE((SELECT last_archive_id FROM remembrances WHERE elder_id = a.elder_id), 0)
        ORDER BY a.id
      `),
      getRemembrance: this.db.prepare(
        "SELECT summary, last_archive_id AS lastArchiveId FROM remembrances WHERE elder_id = ?"
      ),
      getSoul: this.db.prepare("SELECT soul FROM souls WHERE elder_id = ?"),
      listMedications: this.db.prepare(
        "SELECT id, name, dose, schedule, notes FROM medications WHERE elder_id = ? AND active = 1 ORDER BY id"
      ),
      addMedication: this.db.prepare(
        "INSERT INTO medications (elder_id, name, dose, schedule, notes) VALUES (?, ?, ?, ?, ?)"
      ),
      stopMedication: this.db.prepare(
        "UPDATE medications SET active = 0 WHERE elder_id = ? AND active = 1 AND lower(name) = lower(?)"
      ),
      deactivateMedications: this.db.prepare(
        "UPDATE medications SET active = 0 WHERE elder_id = ? AND active = 1"
      ),
      setSoul: this.db.prepare(`
        INSERT INTO souls (elder_id, soul, updated_at)
        VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT (elder_id) DO UPDATE SET soul = excluded.soul, updated_at = excluded.updated_at
      `),
      setRemembrance: this.db.prepare(`
        INSERT INTO remembrances (elder_id, summary, last_archive_id, updated_at)
        VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT (elder_id) DO UPDATE SET
          summary = excluded.summary,
          last_archive_id = excluded.last_archive_id,
          updated_at = excluded.updated_at
      `),
    };
  }

  getHistory(id: string): ChatMessage[] {
    const row = this.stmts.getHistory.get(id) as { history: string } | undefined;
    if (!row) return [];
    try {
      const parsed = JSON.parse(row.history) as ChatMessage[];
      // Older formats stored the system prompt in the history; it is rebuilt fresh each turn now.
      return parsed.filter((m) => m.role !== "system");
    } catch (err) {
      logger.error({ err, id }, "Corrupt history row, starting fresh");
      return [];
    }
  }

  setHistory(id: string, history: ChatMessage[]): void {
    this.stmts.setHistory.run(id, JSON.stringify(history));
  }

  reset(id: string): void {
    this.stmts.deleteHistory.run(id);
  }

  archiveTurns(id: string, turns: { role: "user" | "assistant"; content: string }[]): void {
    const insertAll = this.db.transaction((rows: typeof turns) => {
      for (const t of rows) this.stmts.insertArchive.run(id, t.role, t.content);
    });
    insertAll(turns);
  }

  getPendingArchive(id: string): ArchivedTurn[] {
    return this.stmts.pendingArchive.all(id) as ArchivedTurn[];
  }

  getRemembrance(id: string): Remembrance {
    const row = this.stmts.getRemembrance.get(id) as Remembrance | undefined;
    return row ?? { summary: "", lastArchiveId: 0 };
  }

  setRemembrance(id: string, summary: string, lastArchiveId: number): void {
    this.stmts.setRemembrance.run(id, summary, lastArchiveId);
  }

  getSoul(id: string): Soul | null {
    const row = this.stmts.getSoul.get(id) as { soul: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.soul) as Soul;
    } catch (err) {
      logger.error({ err, id }, "Corrupt soul row, treating elder as unregistered");
      return null;
    }
  }

  setSoul(id: string, soul: Soul): void {
    this.stmts.setSoul.run(id, JSON.stringify(soul));
  }

  listMedications(id: string): Medication[] {
    return this.stmts.listMedications.all(id) as Medication[];
  }

  addMedication(id: string, med: MedicationInput): number {
    const result = this.stmts.addMedication.run(id, med.name, med.dose ?? null, med.schedule, med.notes ?? null);
    return Number(result.lastInsertRowid);
  }

  stopMedication(id: string, name: string): number {
    return this.stmts.stopMedication.run(id, name).changes;
  }

  replaceMedications(id: string, meds: MedicationInput[]): void {
    const replaceAll = this.db.transaction((rows: MedicationInput[]) => {
      this.stmts.deactivateMedications.run(id);
      for (const med of rows) {
        this.stmts.addMedication.run(id, med.name, med.dose ?? null, med.schedule, med.notes ?? null);
      }
    });
    replaceAll(meds);
  }
}

let store: MemoryStore | null = null;

export function createMemoryStore(): MemoryStore {
  if (!store) store = new SqliteMemoryStore(env.databasePath);
  return store;
}
