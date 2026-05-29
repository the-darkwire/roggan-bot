import Database from "better-sqlite3";
import { dbPath } from "./config";

export const MAX_USER_PINNED_TAUNTS = 15;

let db: Database.Database | null = null;

export const getDb = () => {
  if (db) return db;
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_pinned_taunts (
      user_id   TEXT    NOT NULL,
      taunt_id  INTEGER NOT NULL,
      pinned_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, taunt_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_pinned ON user_pinned_taunts (user_id, pinned_at);
  `);
  return db;
};

type PinnedRow = { taunt_id: number };
type CountRow = { count: number };

export const listUserPinnedTauntIds = (userId: string): number[] => {
  const rows = getDb()
    .prepare<[string], PinnedRow>(
      "SELECT taunt_id FROM user_pinned_taunts WHERE user_id = ? ORDER BY pinned_at DESC",
    )
    .all(userId);
  return rows.map((r) => r.taunt_id);
};

export const countUserPinnedTaunts = (userId: string): number => {
  const row = getDb()
    .prepare<[string], CountRow>(
      "SELECT COUNT(*) as count FROM user_pinned_taunts WHERE user_id = ?",
    )
    .get(userId);
  return row?.count ?? 0;
};

export const pinTauntForUser = (userId: string, tauntId: number): { inserted: boolean } => {
  const result = getDb()
    .prepare(
      `INSERT INTO user_pinned_taunts (user_id, taunt_id, pinned_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, taunt_id) DO NOTHING`,
    )
    .run(userId, tauntId, Date.now());
  return { inserted: result.changes > 0 };
};

export const unpinTauntForUser = (userId: string, tauntId: number): { deleted: boolean } => {
  const result = getDb()
    .prepare("DELETE FROM user_pinned_taunts WHERE user_id = ? AND taunt_id = ?")
    .run(userId, tauntId);
  return { deleted: result.changes > 0 };
};
