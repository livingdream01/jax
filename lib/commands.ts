export interface Command {
  command: string;
  description: string;
  category: string;
  icon: string;
  args?: string;
}

export const COMMANDS: Command[] = [
  { command: "/agenda", description: "Today's schedule", category: "Calendar", icon: "\ud83d\udcc5" },
  { command: "/today", description: "Today's agenda (alias)", category: "Calendar", icon: "\ud83d\udcc5" },
  { command: "/tomorrow", description: "Tomorrow's events", category: "Calendar", icon: "\ud83d\udcc5" },
  { command: "/week", description: "This week's calendar", category: "Calendar", icon: "\ud83d\udcc5" },
  { command: "/calendar", description: "Weekly view (alias)", category: "Calendar", icon: "\ud83d\udcc5" },
  { command: "/search", description: "Search the web", category: "Search", icon: "\ud83d\udd0d", args: "query" },
  { command: "/research", description: "Deep research with sources", category: "Search", icon: "\ud83d\udd2c", args: "topic" },
  { command: "/fetch", description: "Fetch & summarize a URL", category: "Search", icon: "\ud83d\udd17", args: "https://..." },
  { command: "/briefing", description: "Get a news briefing", category: "News", icon: "\ud83d\udcf0", args: "tech|business|science" },
  { command: "/stock", description: "Stock price lookup", category: "Finance", icon: "\ud83d\udcc8", args: "AAPL" },
  { command: "/crypto", description: "Crypto price lookup", category: "Finance", icon: "\ud83d\udcb0", args: "BTC" },
  { command: "/remember", description: "Save a fact to memory", category: "Memory", icon: "\ud83e\udde0", args: "fact" },
  { command: "/memories", description: "View stored memories", category: "Memory", icon: "\ud83d\udccb" },
  { command: "/forget", description: "Delete a memory by ID", category: "Memory", icon: "\ud83d\uddd1\ufe0f", args: "id" },
  { command: "/forgetall", description: "Clear all memories", category: "Memory", icon: "\ud83d\udca5" },
  { command: "/focus", description: "Start focus session", category: "Focus", icon: "\u23f3", args: "25m [task]" },
  { command: "/pomo", description: "25-min Pomodoro timer", category: "Focus", icon: "\ud83c\udf45" },
  { command: "/focus stop", description: "Stop focus session", category: "Focus", icon: "\u23f9\ufe0f", args: "[id]" },
  { command: "/focus status", description: "Check focus status", category: "Focus", icon: "\u2753" },
  { command: "/automate", description: "Create scheduled task", category: "Automations", icon: "\u26a1", args: "desc" },
  { command: "/automations", description: "View all automations", category: "Automations", icon: "\ud83d\udccb" },
  { command: "/autodelete", description: "Delete an automation", category: "Automations", icon: "\ud83d\uddd1\ufe0f", args: "name" },
];

export function filterCommands(query: string): Command[] {
  const q = query.toLowerCase();
  return COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q),
  );
}

export function getCategories(): string[] {
  return [...new Set(COMMANDS.map((c) => c.category))];
}