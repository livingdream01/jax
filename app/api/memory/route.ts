import { NextResponse } from "next/server";
import { getMemories, addMemory, deleteMemory, clearAllMemories } from "@/lib/tools/memory";

export async function GET() {
  const memories = await getMemories(100);
  return NextResponse.json({ memories, count: memories.length });
}

export async function POST(req: Request) {
  const { content, category } = await req.json().catch(() => ({}));
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });
  const mem = await addMemory(content, category || "general", "api");
  return NextResponse.json(mem);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) { await deleteMemory(parseInt(id)); return NextResponse.json({ ok: true }); }
  await clearAllMemories();
  return NextResponse.json({ ok: true });
}