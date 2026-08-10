import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", name: "APEX", version: "0.2.0", framework: "Next.js" });
}