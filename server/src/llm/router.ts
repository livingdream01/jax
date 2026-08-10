import { openrouterChat } from "./openrouter.js";
import JARVIS_PERSONA from "./personality.js";

type Role = "system" | "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

const DEEPSEEK_MODEL = "deepseek/deepseek-chat";
const KIMI_MODEL = "moonshotai/kimi-k2.6";

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

  if (history.length > 21) {
    const systemMsg = history[0];
    conversationStore.set(sessionId, [systemMsg, ...history.slice(-20)]);
  }

  return result;
}

async function tryLLM(
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<string> {
  try {
    return await openrouterChat(DEEPSEEK_MODEL, messages, onChunk);
  } catch (err) {
    console.warn("[JAX] DeepSeek failed, trying Kimi:", (err as Error).message);
    try {
      return await openrouterChat(KIMI_MODEL, messages, onChunk);
    } catch (err2) {
      console.error("[JAX] Kimi also failed:", (err2 as Error).message);
      const fallback =
        "I'm afraid my neural circuits aren't fully powered yet, sir. The API key seems to be missing or invalid.\n\n" +
        "To activate me, sign up at openrouter.ai for a free API key, then add it to `.env`:\n" +
        "  OPENROUTER_API_KEY=sk-or-v1-your-key\n\n" +
        "One key gives access to DeepSeek, Kimi, and many other models. Restart me once configured.";
      onChunk(fallback);
      return fallback;
    }
  }
}
