import { getDb, saveDb } from "@/lib/db";

interface Memory {
  id: number;
  content: string;
  category: string;
  source: string;
  created_at: string;
}

export async function addMemory(content: string, category = "general", source = "auto"): Promise<Memory> {
  const db = await getDb();
  db.run("INSERT INTO memories (content, category, source) VALUES (?, ?, ?)", [content, category, source]);
  saveDb();
  const result = db.exec("SELECT last_insert_rowid() as id");
  const id = Number(result[0].values[0][0]);
  return { id, content, category, source, created_at: new Date().toISOString() };
}

export async function getMemories(limit = 50, category?: string): Promise<Memory[]> {
  const db = await getDb();
  let sql = "SELECT * FROM memories";
  const params: any[] = [];
  if (category) { sql += " WHERE category = ?"; params.push(category); }
  sql += " ORDER BY updated_at DESC LIMIT ?"; params.push(limit);
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Memory[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as Memory);
  stmt.free();
  return rows;
}

export async function deleteMemory(id: number): Promise<boolean> {
  const db = await getDb();
  db.run("DELETE FROM memories WHERE id = ?", [id]);
  saveDb();
  return true;
}

export async function clearAllMemories(): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM memories");
  saveDb();
}

export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return "";
  return `\n\n## User Context (remembered facts)\n${memories.map((m, i) => `${i + 1}. [${m.category}] ${m.content}`).join("\n")}\n## End Context\n`;
}

export async function extractMemoriesFromChat(
  userMessage: string,
  assistantResponse: string,
  llmCall: (messages: { role: string; content: string }[]) => Promise<string>,
): Promise<void> {
  const prompt = `Extract personal facts, preferences, or important info about the user from this conversation. One fact per line, prefixed with category in brackets. If nothing meaningful, return "NONE".

Categories: personal, work, preferences, goals, projects, technical, other

User: ${userMessage.slice(0, 500)}
Assistant: ${assistantResponse.slice(0, 500)}
Extracted facts:`;
  try {
    const result = await llmCall([
      { role: "system", content: "You are a fact extraction system." },
      { role: "user", content: prompt },
    ]);
    for (const line of result.split("\n").filter(l => l.trim() && l.trim() !== "NONE")) {
      const match = line.match(/^\[(\w+)\]\s+(.+)/);
      if (match) await addMemory(match[2].trim(), match[1].toLowerCase(), "auto");
      else if (line.trim().length > 5) await addMemory(line.trim(), "general", "auto");
    }
  } catch {}
}