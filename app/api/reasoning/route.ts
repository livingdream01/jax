import { NextResponse } from "next/server";
import { getTraces, getTrace, deleteTrace, clearTraces } from "@/lib/tools/reasoning";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const sessionId = searchParams.get("sessionId") || "default";

  if (id) {
    const trace = await getTrace(parseInt(id));
    if (!trace) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ trace });
  }

  const traces = await getTraces(sessionId);
  return NextResponse.json({ traces, count: traces.length });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const sessionId = searchParams.get("sessionId") || "default";

  if (id) {
    await deleteTrace(parseInt(id));
    return NextResponse.json({ ok: true });
  }
  await clearTraces(sessionId);
  return NextResponse.json({ ok: true });
}