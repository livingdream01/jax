import { getDb, saveDb } from "@/lib/db";
import type { ThinkingStep } from "@/lib/agent/loop";

export interface ReasoningTrace {
  id: number;
  sessionId: string;
  userMessage: string;
  steps: ThinkingStep[];
  response: string;
  createdAt: string;
}

interface TraceRow {
  id: number;
  session_id: string;
  user_message: string;
  steps: string;
  response: string;
  created_at: string;
}

export async function addTrace(
  sessionId: string,
  userMessage: string,
  steps: ThinkingStep[],
  response: string,
): Promise<ReasoningTrace> {
  const db = await getDb();
  db.run(
    "INSERT INTO reasoning_traces (session_id, user_message, steps, response) VALUES (?, ?, ?, ?)",
    [sessionId, userMessage, JSON.stringify(steps), response],
  );
  saveDb();
  const result = db.exec("SELECT last_insert_rowid() as id");
  const id = Number(result[0].values[0][0]);
  return { id, sessionId, userMessage, steps, response, createdAt: new Date().toISOString() };
}

function rowToTrace(row: TraceRow): ReasoningTrace {
  let steps: ThinkingStep[] = [];
  try { steps = JSON.parse(row.steps); } catch {}
  return {
    id: row.id,
    sessionId: row.session_id,
    userMessage: row.user_message,
    steps,
    response: row.response,
    createdAt: row.created_at,
  };
}

export async function getTraces(sessionId: string, limit = 50): Promise<ReasoningTrace[]> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT * FROM reasoning_traces WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
  );
  stmt.bind([sessionId, limit]);
  const rows: ReasoningTrace[] = [];
  while (stmt.step()) {
    rows.push(rowToTrace(stmt.getAsObject() as unknown as TraceRow));
  }
  stmt.free();
  return rows;
}

export async function getTrace(id: number): Promise<ReasoningTrace | null> {
  const db = await getDb();
  const stmt = db.prepare("SELECT * FROM reasoning_traces WHERE id = ?");
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const trace = rowToTrace(stmt.getAsObject() as unknown as TraceRow);
  stmt.free();
  return trace;
}

export async function deleteTrace(id: number): Promise<boolean> {
  const db = await getDb();
  db.run("DELETE FROM reasoning_traces WHERE id = ?", [id]);
  saveDb();
  return true;
}

export async function clearTraces(sessionId: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM reasoning_traces WHERE session_id = ?", [sessionId]);
  saveDb();
}