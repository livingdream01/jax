import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { getAllTasks, createTask, deleteTask, toggleTask } from "@/lib/tools/automator";
import { getNews } from "@/lib/tools/news";
import { webSearch } from "@/lib/tools/web-search";

async function runAutomationTask(task: any): Promise<void> {
  switch (task.type) {
    case "briefing": { const params = JSON.parse(task.params || "{}"); await getNews(params.category); break; }
    case "search": { const params = JSON.parse(task.params || "{}"); if (params.query) await webSearch(params.query); break; }
  }
}

export async function GET() {
  const db = await getDb();
  const tasks = getAllTasks(db);
  return NextResponse.json({ tasks, count: tasks.length });
}

export async function POST(req: Request) {
  const db = await getDb();
  const { name, cronExpression, type, params, enabled } = await req.json().catch(() => ({}));
  if (!name || !cronExpression) return NextResponse.json({ error: "name and cronExpression required" }, { status: 400 });
  const task = createTask(db, { name, cronExpression, type: type || "custom", params: JSON.stringify(params || {}), enabled: enabled !== false }, async (t) => { await runAutomationTask(t); saveDb(); });
  saveDb();
  return NextResponse.json(task);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getDb();
  deleteTask(db, id);
  saveDb();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  const { enabled } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getDb();
  const task = toggleTask(db, id, !!enabled, async (t) => { await runAutomationTask(t); saveDb(); });
  saveDb();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(task);
}