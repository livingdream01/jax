import { getDb, saveDb } from "../db.js";

interface Memory {
  id: number;
  content: string;
  category: string;
  source: string;
  created_at: string;
}

export async function addMemory(
  content: string,
  category = "general",
  source = "auto",
): Promise<Memory> {
  const db = await getDb();
  const stmt = db.prepare(
    "INSERT INTO memories (content, category, source) VALUES (?, ?, ?)"
  );
  stmt.run([content, category, source]);
  stmt.free();
  saveDb();

  const result = db.exec("SELECT last_insert_rowid() as id");
  const id = Number(result[0].values[0][0]);

  return { id, content, category, source, created_at: new Date().toISOString() };
}

export async function getMemories(
  limit = 50,
  category?: string,
): Promise<Memory[]> {
  const db = await getDb();

  let sql = "SELECT * FROM memories";
  const params: string[] = [];

  if (category) {
    sql += " WHERE category = ?";
    params.push(category);
  }

  sql += " ORDER BY updated_at DESC LIMIT ?";
  params.push(String(limit));

  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Memory[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push(row as unknown as Memory);
  }
  stmt.free();

  return rows;
}

export async function searchMemories(query: string): Promise<Memory[]> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT * FROM memories WHERE content LIKE ? ORDER BY updated_at DESC LIMIT 10"
  );
  stmt.bind([`%${query}%`]);
  const rows: Memory[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Memory);
  }
  stmt.free();
  return rows;
}

export async function deleteMemory(id: number): Promise<boolean> {
  const db = await getDb();
  const stmt = db.prepare("DELETE FROM memories WHERE id = ?");
  stmt.run([id]);
  stmt.free();
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

  const lines = memories.map(
    (m, i) => `${i + 1}. [${m.category}] ${m.content}`
  );

  return `\n\n## User Context (remembered facts from past conversations)\n${lines.join("\n")}\n## End Context\n`;
}

export async function extractMemoriesFromChat(
  userMessage: string,
  assistantResponse: string,
  llmCall: (messages: { role: string; content: string }[]) => Promise<string>,
): Promise<void> {
  const prompt = `Extract any personal facts, preferences, or important information about the user from this conversation. Only extract if the user explicitly shares something about themselves (name, job, preferences, opinions, goals, projects, etc.). Return one fact per line, each prefixed with a category in brackets. If nothing meaningful is shared, return "NONE".

Categories: personal, work, preferences, goals, projects, technical, other

User: ${userMessage.slice(0, 500)}
Assistant: ${assistantResponse.slice(0, 500)}

Extracted facts:`;

  try {
    const result = await llmCall([
      { role: "system", content: "You are a fact extraction system. Be concise." },
      { role: "user", content: prompt },
    ]);

    const lines = result.split("\n").filter((l) => l.trim() && l.trim() !== "NONE");

    for (const line of lines) {
      const match = line.match(/^\[(\w+)\]\s+(.+)/);
      if (match) {
        await addMemory(match[2].trim(), match[1].toLowerCase(), "auto");
      } else if (line.trim().length > 5) {
        await addMemory(line.trim(), "general", "auto");
      }
    }
  } catch {
    // Silently skip extraction on failure
  }
}
