import { execSync } from "child_process";

export interface FocusSession {
  id: string;
  startTime: number;
  durationMinutes: number;
  endTime: number;
  task?: string;
  cancelled: boolean;
}

const activeSessions: Map<string, FocusSession> = new Map();
let timerHandle: ReturnType<typeof setInterval> | null = null;

function notify(title: string, message: string): void {
  try {
    execSync(`osascript -e 'display notification "${message.replace(/"/g, "\\\"")}" with title "${title.replace(/"/g, "\\\"")}"'`, { timeout: 3000 });
  } catch {
    // notification failed, silent
  }
}

function ensureGlobalTimer(): void {
  if (timerHandle) return;
  timerHandle = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeSessions) {
      if (session.cancelled) continue;
      if (now >= session.endTime) {
        notify("APEX Focus", `Focus session complete! ${session.task ? `Task: ${session.task}` : ""}`);
        session.cancelled = true;
        activeSessions.delete(id);
      }
    }
    if (activeSessions.size === 0 && timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }, 5000);
}

export function startFocus(
  minutes: number,
  task?: string,
): FocusSession {
  const id = `focus-${Date.now()}`;
  const startTime = Date.now();
  const endTime = startTime + minutes * 60 * 1000;

  const session: FocusSession = {
    id,
    startTime,
    durationMinutes: minutes,
    endTime,
    task,
    cancelled: false,
  };

  activeSessions.set(id, session);
  ensureGlobalTimer();

  const taskStr = task ? ` — ${task}` : "";
  notify("APEX Focus", `Focus session started: ${minutes} minutes${taskStr}. Lock in, sir.`);

  return session;
}

export function stopFocus(id?: string): FocusSession | null {
  if (id) {
    const session = activeSessions.get(id);
    if (session) {
      session.cancelled = true;
      activeSessions.delete(id);
      notify("APEX Focus", "Focus session stopped.");
    }
    return session || null;
  }

  // Stop all active sessions
  for (const [sid, session] of activeSessions) {
    session.cancelled = true;
    activeSessions.delete(sid);
  }
  notify("APEX Focus", "All focus sessions stopped.");
  return null;
}

export function getActiveSessions(): FocusSession[] {
  const now = Date.now();
  return [...activeSessions.values()].filter((s) => !s.cancelled && now < s.endTime);
}

export function getSessionStatus(): string {
  const sessions = getActiveSessions();
  if (sessions.length === 0) return "No active focus sessions, sir.";

  const lines: string[] = [];
  for (const s of sessions) {
    const remaining = Math.max(0, Math.ceil((s.endTime - Date.now()) / 60000));
    const task = s.task ? ` — ${s.task}` : "";
    lines.push(`• **${remaining} min remaining**${task} (started ${new Date(s.startTime).toLocaleTimeString()})`);
    lines.push(`  ID: \`${s.id}\` — Use \`/focus stop ${s.id}\` to cancel.`);
  }
  return `**Active focus sessions:**\n\n${lines.join("\n")}`;
}