import { openrouterChat } from "@/lib/llm/openrouter";
import { buildAgentSystemPrompt } from "./planner";
import { findTool } from "./tools";
import { getMemories, formatMemoriesForPrompt, extractMemoriesFromChat } from "@/lib/tools/memory";

export interface ThinkingStep {
  type: "think" | "plan" | "action" | "observation" | "reflect" | "respond";
  content: string;
  status?: "pending" | "running" | "done" | "error";
  toolName?: string;
  toolArgs?: Record<string, string>;
}

interface AgentResult {
  response: string;
  steps: ThinkingStep[];
}

const MODEL = "deepseek/deepseek-chat";
const MAX_ACTIONS = 5;
const MAX_ITERATIONS = 3;

export async function runAgentLoop(
  userMessage: string,
  sessionId: string,
  onStep: (step: ThinkingStep) => void,
  onChunk: (text: string) => void,
): Promise<AgentResult> {
  const steps: ThinkingStep[] = [];
  const memories = await getMemories(40);
  const memoryBlock = formatMemoriesForPrompt(memories);

  let conversation: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system" as const, content: buildAgentSystemPrompt() + memoryBlock },
    { role: "user" as const, content: userMessage },
  ];

  let iteration = 0;
  let complete = false;
  let finalResponse = "";

  while (!complete && iteration < MAX_ITERATIONS) {
    iteration++;

    const raw = await callLLM(conversation, onStep, steps);
    conversation.push({ role: "assistant", content: raw });

    const parsed = parseAgentResponse(raw);

    // Handle ACTIONS
    if (parsed.actions.length > 0 && steps.filter((s) => s.type === "action").length < MAX_ACTIONS) {
      for (const action of parsed.actions) {
        const tool = findTool(action.name);
        const step: ThinkingStep = {
          type: "action",
          content: `Calling ${action.name}(${Object.entries(action.args).map(([k, v]) => `${k}=${v}`).join(", ")})`,
          status: "running",
          toolName: action.name,
          toolArgs: action.args,
        };
        steps.push(step);
        onStep(step);

        if (tool) {
          try {
            const result = await tool.execute(action.args);
            step.status = "done";
            step.content = result;
            onStep(step);
            conversation.push({ role: "user", content: `OBSERVATION: ${result}` });
          } catch (err: any) {
            step.status = "error";
            step.content = `Error: ${err.message}`;
            onStep(step);
            conversation.push({ role: "user", content: `OBSERVATION: Error — ${err.message}` });
          }
        } else {
          step.status = "error";
          step.content = `Tool "${action.name}" not available.`;
          onStep(step);
          conversation.push({ role: "user", content: `OBSERVATION: Tool "${action.name}" not found. Available tools: ${findTool("") ? "listed above" : "none"}` });
        }
      }
    }

    // Check if we should loop again
    if (parsed.reflect && parsed.reflect.includes("complete") || parsed.respond) {
      complete = true;
    } else if (parsed.reflect && (parsed.reflect.includes("need more") || parsed.reflect.includes("incomplete"))) {
      // Continue loop — add continuation prompt
      conversation.push({ role: "user", content: "Continue your analysis. What else do you need to do?" });
    } else {
      // No reflection found — assume complete
      complete = true;
    }
  }

  // Generate final response
  if (complete) {
    finalResponse = await generateFinalResponse(conversation, onChunk);
  } else {
    finalResponse = await generateFinalResponse(conversation, onChunk);
  }

  // Extract memories in background
  extractMemoriesFromChat(userMessage, finalResponse, async (msgs) =>
    openrouterChat(MODEL, msgs as any, () => {})
  ).catch(() => {});

  return { response: finalResponse, steps };
}

async function callLLM(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onStep: (step: ThinkingStep) => void,
  steps: ThinkingStep[],
): Promise<string> {
  let buffer = "";
  return openrouterChat(MODEL, messages, (chunk) => {
    buffer += chunk;
    // Detect thinking steps as they stream
    detectThinkingSteps(buffer, onStep, steps);
  });
}

function detectThinkingSteps(
  text: string,
  onStep: (step: ThinkingStep) => void,
  steps: ThinkingStep[],
) {
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("THINK:") || trimmed.startsWith("THINK：")) {
      const content = trimmed.replace(/^THINK[：:]\s*/i, "").trim();
      if (content && !steps.some((s) => s.type === "think" && s.content === content)) {
        const step: ThinkingStep = { type: "think", content, status: "done" };
        steps.push(step);
        onStep(step);
      }
    }

    if (trimmed.startsWith("PLAN:") || trimmed.startsWith("PLAN：")) {
      const content = trimmed.replace(/^PLAN[：:]\s*/i, "").trim();
      if (content && !steps.some((s) => s.type === "plan" && s.content === content)) {
        const step: ThinkingStep = { type: "plan", content, status: "done" };
        steps.push(step);
        onStep(step);
      }
    }

    if (trimmed.startsWith("REFLECT:") || trimmed.startsWith("REFLECT：")) {
      const content = trimmed.replace(/^REFLECT[：:]\s*/i, "").trim();
      if (content && !steps.some((s) => s.type === "reflect" && s.content === content)) {
        const step: ThinkingStep = { type: "reflect", content, status: "done" };
        steps.push(step);
        onStep(step);
      }
    }
  }
}

function parseAgentResponse(raw: string): {
  think?: string;
  plan?: string;
  actions: { name: string; args: Record<string, string> }[];
  reflect?: string;
  respond?: string;
} {
  const actions: { name: string; args: Record<string, string> }[] = [];
  let think: string | undefined;
  let plan: string | undefined;
  let reflect: string | undefined;
  let respond: string | undefined;

  const lines = raw.split("\n");
  for (const line of lines) {
    const t = line.trim();

    if (t.startsWith("THINK:") || t.startsWith("THINK：")) {
      think = t.replace(/^THINK[：:]\s*/i, "").trim();
    } else if (t.startsWith("PLAN:") || t.startsWith("PLAN：")) {
      plan = t.replace(/^PLAN[：:]\s*/i, "").trim();
    } else if (t.startsWith("REFLECT:") || t.startsWith("REFLECT：")) {
      reflect = t.replace(/^REFLECT[：:]\s*/i, "").trim();
    } else if (t.startsWith("RESPOND:") || t.startsWith("RESPOND：")) {
      respond = t.replace(/^RESPOND[：:]\s*/i, "").trim();
    } else if (t.startsWith("ACTION:") || t.startsWith("ACTION：")) {
      const actionStr = t.replace(/^ACTION[：:]\s*/i, "").trim();
      const match = actionStr.match(/^(\w+)\(([^)]*)\)/);
      if (match) {
        const name = match[1];
        const argsStr = match[2];
        const args: Record<string, string> = {};
        const argPairs = argsStr.split(",").map((s) => s.trim()).filter(Boolean);
        for (const pair of argPairs) {
          const eq = pair.indexOf("=");
          if (eq > 0) {
            args[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
          }
        }
        actions.push({ name, args });
      }
    }
  }

  return { think, plan, actions, reflect, respond };
}

async function generateFinalResponse(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onChunk: (text: string) => void,
): Promise<string> {
  const finalPrompt = [
    ...messages,
    {
      role: "user" as const,
      content:
        "Now deliver your final response to the user. Be concise, authoritative, and in your APEX persona. Do not include any THINK, PLAN, ACTION, or REFLECT tags. Just the response.",
    },
  ];
  return openrouterChat(MODEL, finalPrompt, onChunk);
}