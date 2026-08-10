import { NextResponse } from "next/server";
import { getNews, clearNewsCache } from "@/lib/tools/news";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const articles = await getNews(category);
  return NextResponse.json({ articles, count: articles.length });
}

export async function POST() {
  clearNewsCache();
  const articles = await getNews();
  return NextResponse.json({ articles, count: articles.length, refreshed: true });
}