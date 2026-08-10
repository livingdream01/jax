import cron from "node-cron";
import type { Database, Statement } from "sql.js";

export interface AutomationTask {
  id: number;
  name: string;
  cronExpression: string;
  type: "briefing" | "search" | "custom";
  params: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: "success" | "failed" | null;
  createdAt: string;
}

interface TaskRow {
  id: number;
  name: string;
  cron_expression: string;
  type: string;
  params: string;
  enabled: number;
  last_run: string | null;
  last_status: string | null;
  created_at: string;
}

const runningJobs = new Map<number, cron.ScheduledTask>();

function dbRun(db: Database, sql: string, params?: any[]): number {
  db.run(sql, params);
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result.length > 0 && result[0].values.length > 0) {
    return Number(result[0].values[0][0]);
  }
  return 0;
}

export function initAutomator(
  db: Database,
  runTask: (task: AutomationTask) => Promise<void>,
): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      type TEXT DEFAULT 'custom',
      params TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      last_run TEXT,
      last_status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const tasks = getAllTasks(db);
  for (const task of tasks) {
    if (task.enabled) startJob(task, db, runTask);
  }
}

export function createTask(
  db: Database,
  task: Omit<AutomationTask, "id" | "lastRun" | "lastStatus" | "createdAt">,
  runTask: (task: AutomationTask) => Promise<void>,
): AutomationTask {
  if (!cron.validate(task.cronExpression)) {
    throw new Error(`Invalid cron expression: ${task.cronExpression}`);
  }

  db.run(
    "INSERT INTO automations (name, cron_expression, type, params, enabled) VALUES (?, ?, ?, ?, ?)",
    [task.name, task.cronExpression, task.type, task.params, task.enabled ? 1 : 0],
  );

  const id = dbRun(db, "SELECT last_insert_rowid() as id", []);

  const created: AutomationTask = {
    id,
    ...task,
    lastRun: null,
    lastStatus: null,
    createdAt: new Date().toISOString(),
  };

  if (created.enabled) {
    startJob(created, db, runTask);
  }

  return created;
}

export function getAllTasks(db: Database): AutomationTask[] {
  const stmt = db.prepare("SELECT * FROM automations ORDER BY created_at DESC");
  const tasks: AutomationTask[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as TaskRow;
    tasks.push({
      id: row.id,
      name: row.name,
      cronExpression: row.cron_expression,
      type: row.type as AutomationTask["type"],
      params: row.params,
      enabled: row.enabled === 1,
      lastRun: row.last_run,
      lastStatus: row.last_status as AutomationTask["lastStatus"],
      createdAt: row.created_at,
    });
  }
  stmt.free();
  return tasks;
}

function getOneTask(db: Database, id: number): AutomationTask | null {
  const stmt = db.prepare("SELECT * FROM automations WHERE id = ?");
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject() as unknown as TaskRow;
  stmt.free();
  return {
    id: row.id,
    name: row.name,
    cronExpression: row.cron_expression,
    type: row.type as AutomationTask["type"],
    params: row.params,
    enabled: row.enabled === 1,
    lastRun: row.last_run,
    lastStatus: row.last_status as AutomationTask["lastStatus"],
    createdAt: row.created_at,
  };
}

export function deleteTask(db: Database, id: number): void {
  stopJob(id);
  db.run("DELETE FROM automations WHERE id = ?", [id]);
}

export function toggleTask(
  db: Database,
  id: number,
  enabled: boolean,
  runTask: (task: AutomationTask) => Promise<void>,
): AutomationTask | null {
  const task = getOneTask(db, id);
  if (!task) return null;

  db.run("UPDATE automations SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id]);

  task.enabled = enabled;

  if (enabled) {
    startJob(task, db, runTask);
  } else {
    stopJob(id);
  }

  return task;
}

function startJob(
  task: AutomationTask,
  db: Database,
  runTask: (task: AutomationTask) => Promise<void>,
): void {
  if (!cron.validate(task.cronExpression)) return;

  const job = cron.schedule(task.cronExpression, async () => {
    try {
      await runTask(task);
      db.run("UPDATE automations SET last_run = datetime('now'), last_status = 'success' WHERE id = ?", [task.id]);
    } catch (err) {
      console.error(`[JAX] Automation "${task.name}" failed:`, err);
      db.run("UPDATE automations SET last_run = datetime('now'), last_status = 'failed' WHERE id = ?", [task.id]);
    }
  });

  runningJobs.set(task.id, job);
}

function stopJob(id: number): void {
  const job = runningJobs.get(id);
  if (job) {
    job.stop();
    runningJobs.delete(id);
  }
}

export function stopAllJobs(): void {
  for (const [id, job] of runningJobs) {
    job.stop();
    runningJobs.delete(id);
  }
}
