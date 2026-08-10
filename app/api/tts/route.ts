import { NextResponse } from "next/server";

const FISH_AUDIO_VOICE = "d54ff84272464629b509682d42db5661";

export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({}));
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "FISH_AUDIO_API_KEY not set" }, { status: 400 });

  try {
    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, model: "s2.1-pro-free" },
      body: JSON.stringify({ text, reference_id: FISH_AUDIO_VOICE, format: "mp3", latency: "low", normalize: true }),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const buffer = await res.arrayBuffer();
    return new Response(Buffer.from(buffer), { headers: { "Content-Type": "audio/mpeg" } });
  } catch {
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}