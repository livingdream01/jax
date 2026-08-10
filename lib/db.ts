import initSqlJs, { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let db: Database;
const DB_PATH = join(process.cwd(), "data", "apex-memory.db");

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA journal_mode=WAL");
  db.run("PRAGMA synchronous=NORMAL");

  db.run(`CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    source TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  return db;
}

export function saveDb(): void {
  if (!db) return;
  writeFileSync(DB_PATH, Buffer.from(db.export()));
}