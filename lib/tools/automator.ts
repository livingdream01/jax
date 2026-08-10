import cron from "node-cron";
import type { Database } from "sql.js";

export interface AutomationTask {
  id: number; name: string; cronExpression: string; type: "briefing" | "search" | "custom";
  params: string; enabled: boolean; lastRun: string | null; lastStatus: "success" | "failed" | null; createdAt: string;
}

const runningJobs = new Map<number, cron.ScheduledTask>();

export function initAutomator(db: Database, runTask: (task: AutomationTask) => Promise<void>): void {
  db.run(`CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cron_expression TEXT NOT NULL,
    type TEXT DEFAULT 'custom', params TEXT DEFAULT '{}', enabled INTEGER DEFAULT 1,
    last_run TEXT, last_status TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
  for (const task of getAllTasks(db)) { if (task.enabled) startJob(task, db, runTask); }
}

export function createTask(db: Database, task: Omit<AutomationTask, "id" | "lastRun" | "lastStatus" | "createdAt">, runTask: (t: AutomationTask) => Promise<void>): AutomationTask {
  if (!cron.validate(task.cronExpression)) throw new Error(`Invalid cron: ${task.cronExpression}`);
  db.run("INSERT INTO automations (name, cron_expression, type, params, enabled) VALUES (?, ?, ?, ?, ?)", [task.name, task.cronExpression, task.type, task.params, task.enabled ? 1 : 0]);
  const result = db.exec("SELECT last_insert_rowid() as id");
  const id = Number(result[0].values[0][0]);
  const created: AutomationTask = { id, ...task, lastRun: null, lastStatus: null, createdAt: new Date().toISOString() };
  if (created.enabled) startJob(created, db, runTask);
  return created;
}

export function getAllTasks(db: Database): AutomationTask[] {
  const stmt = db.prepare("SELECT * FROM automations ORDER BY created_at DESC");
  const tasks: AutomationTask[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    tasks.push({ id: row.id, name: row.name, cronExpression: row.cron_expression, type: row.type, params: row.params, enabled: row.enabled === 1, lastRun: row.last_run, lastStatus: row.last_status, createdAt: row.created_at });
  }
  stmt.free();
  return tasks;
}

export function deleteTask(db: Database, id: number): void {
  stopJob(id);
  db.run("DELETE FROM automations WHERE id = ?", [id]);
}

export function toggleTask(db: Database, id: number, enabled: boolean, runTask: (t: AutomationTask) => Promise<void>): AutomationTask | null {
  const stmt = db.prepare("SELECT * FROM automations WHERE id = ?");
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject() as any;
  stmt.free();
  const task: AutomationTask = { id: row.id, name: row.name, cronExpression: row.cron_expression, type: row.type, params: row.params, enabled, lastRun: row.last_run, lastStatus: row.last_status, createdAt: row.created_at };
  db.run("UPDATE automations SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id]);
  if (enabled) startJob(task, db, runTask); else stopJob(id);
  return task;
}

function startJob(task: AutomationTask, db: Database, runTask: (t: AutomationTask) => Promise<void>): void {
  if (!cron.validate(task.cronExpression)) return;
  const job = cron.schedule(task.cronExpression, async () => {
    try { await runTask(task); db.run("UPDATE automations SET last_run = datetime('now'), last_status = 'success' WHERE id = ?", [task.id]); }
    catch (err) { console.error(`[APEX] "${task.name}" failed:`, err); db.run("UPDATE automations SET last_run = datetime('now'), last_status = 'failed' WHERE id = ?", [task.id]); }
  });
  runningJobs.set(task.id, job);
}

function stopJob(id: number): void {
  const job = runningJobs.get(id);
  if (job) { job.stop(); runningJobs.delete(id); }
}