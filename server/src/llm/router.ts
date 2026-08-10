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
        "I'm afraid my neural circuits aren't fully powered yet, sir. Both DeepSeek and Kimi APIs are unreachable — likely an API key issue.\n\n" +
        "To activate me, add your keys to the `.env` file:\n" +
        "  • DeepSeek: sign up at platform.deepseek.com (free credits)\n" +
        "  • Kimi: sign up at platform.moonshot.cn (free credits)\n\n" +
        "Once configured, restart the server and I'll be at full capacity.";
      onChunk(fallback);
      return fallback;
    }
  }
}
