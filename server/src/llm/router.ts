import { deepseekChat } from "./deepseek.js";
import { kimiChat } from "./kimi.js";
import JARVIS_PERSONA from "./personality.js";

type Role = "system" | "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

const conversationStore = new Map<string, Message[]>();

export function getHistory(sessionId: string): Message[] {
  return conversationStore.get(sessionId) || [];
}

export function clearHistory(sessionId: string): void {
  conversationStore.delete(sessionId);
}

export async function chat(
  sessionId: string,
  userMessage: string,
  onChunk: (text: string) => void,
): Promise<string> {
  if (!conversationStore.has(sessionId)) {
    conversationStore.set(sessionId, [
      { role: "system", content: JARVIS_PERSONA },
    ]);
  }

  const history = conversationStore.get(sessionId)!;
  history.push({ role: "user", content: userMessage });

  const result = await tryLLM(history, onChunk);
  history.push({ role: "assistant", content: result });

  // Keep only last 20 messages to avoid context bloat
  if (history.length > 21) {
    const systemMsg = history[0];
    conversationStore.set(sessionId, [
      systemMsg,
      ...history.slice(-20),
    ]);
  }

  return result;
}

async function tryLLM(
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<string> {
  try {
    return await deepseekChat(messages, onChunk);
  } catch (err) {
    console.warn("[JAX] DeepSeek failed, trying Kimi:", (err as Error).message);
    try {
      return await kimiChat(messages, onChunk);
    } catch (err2) {
      console.error("[JAX] Kimi also failed:", (err2 as Error).message);
      const fallback =
        "I'm afraid both my primary and backup systems are unavailable at the moment, sir. I suggest checking your API keys and trying again shortly.";
      onChunk(fallback);
      return fallback;
    }
  }
}
