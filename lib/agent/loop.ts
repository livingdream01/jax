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
  const emit = (step: ThinkingStep) => {
    steps.push(step);
    onStep(step);
  };

  const memories = await getMemories(40);
  const memoryBlock = formatMemoriesForPrompt(memories);

  const conversation: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: buildAgentSystemPrompt() + memoryBlock },
    { role: "user", content: userMessage },
  ];

  let iteration = 0;
  let complete = false;
  let actionCount = 0;

  while (!complete && iteration < MAX_ITERATIONS) {
    iteration++;

    const raw = await openrouterChat(MODEL, conversation, () => {});
    conversation.push({ role: "assistant", content: raw });

    const parsed = parseAgentResponse(raw);

    if (parsed.think) emit({ type: "think", content: parsed.think, status: "done" });
    if (parsed.plan) emit({ type: "plan", content: parsed.plan, status: "done" });

    for (const action of parsed.actions) {
      if (actionCount >= MAX_ACTIONS) break;
      actionCount++;

      const tool = findTool(action.name);
      const callStr = `Calling ${action.name}(${Object.entries(action.args)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")})`;

      const step: ThinkingStep = {
        type: "action",
        content: callStr,
        status: "running",
        toolName: action.name,
        toolArgs: action.args,
      };
      emit(step);

      let result: string;
      if (tool) {
        try {
          result = await tool.execute(action.args);
          step.status = "done";
        } catch (err: any) {
          result = `Error: ${err.message}`;
          step.status = "error";
        }
      } else {
        result = `Tool "${action.name}" is not available.`;
        step.status = "error";
      }

      step.content = result;
      onStep(step);
      conversation.push({ role: "user", content: `OBSERVATION: ${result}` });
    }

    if (parsed.reflect) emit({ type: "reflect", content: parsed.reflect, status: "done" });

    // Complete when the model issued no further actions (nothing left to act on)
    if (parsed.actions.length === 0) {
      complete = true;
    } else if (/need more|incomplete|continue|further|not (yet )?complete/i.test(parsed.reflect || "")) {
      conversation.push({ role: "user", content: "Continue your analysis. What else do you need to do?" });
    } else {
      complete = true;
    }
  }

  const finalResponse = await generateFinalResponse(conversation, onChunk);

  extractMemoriesFromChat(userMessage, finalResponse, async (msgs) =>
    openrouterChat(MODEL, msgs as any, () => {}),
  ).catch(() => {});

  return { response: finalResponse, steps };
}

function parseAgentResponse(raw: string): {
  think?: string;
  plan?: string;
  actions: { name: string; args: Record<string, string> }[];
  reflect?: string;
  respond?: string;
} {
  const result: {
    think?: string;
    plan?: string;
    actions: { name: string; args: Record<string, string> }[];
    reflect?: string;
    respond?: string;
  } = { actions: [] };

  let current: "think" | "plan" | "reflect" | "respond" | null = null;

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;

    const header = t.match(/^(THINK|PLAN|REFLECT|RESPOND)[：:]\s*(.*)$/i);
    if (header) {
      const section = header[1].toLowerCase() as "think" | "plan" | "reflect" | "respond";
      result[section] = header[2].trim();
      current = section;
      continue;
    }

    const actionMatch = t.match(/^ACTION[：:]\s*(.+)$/i);
    if (actionMatch) {
      current = null;
      const action = parseAction(actionMatch[1]);
      if (action) result.actions.push(action);
      continue;
    }

    // Ignore anything that looks like another section or observation
    if (/^OBSERVATION[：:]/i.test(t)) {
      current = null;
      continue;
    }

    // Continuation lines append to the current section
    if (current && result[current] !== undefined) {
      result[current] += "\n" + t;
    }
  }

  return result;
}

function parseAction(actionStr: string): { name: string; args: Record<string, string> } | null {
  const match = actionStr.match(/^(\w+)\(([^)]*)\)/);
  if (!match) return null;

  const name = match[1];
  const args: Record<string, string> = {};
  for (const pair of match[2].split(",").map((s) => s.trim()).filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq > 0) {
      args[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return { name, args };
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