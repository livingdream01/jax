import { execSync } from "child_process";

export interface FocusSession {
  id: string; startTime: number; durationMinutes: number; endTime: number; task?: string; cancelled: boolean;
}

const activeSessions: Map<string, FocusSession> = new Map();
let timerHandle: ReturnType<typeof setInterval> | null = null;

function notify(title: string, message: string): void {
  try { execSync(`osascript -e 'display notification "${message.replace(/"/g, "\\\"")}" with title "${title.replace(/"/g, "\\\"")}"'`, { timeout: 3000 }); } catch {}
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
    if (activeSessions.size === 0 && timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }, 5000);
}

export function startFocus(minutes: number, task?: string): FocusSession {
  const id = `focus-${Date.now()}`;
  const session: FocusSession = { id, startTime: Date.now(), durationMinutes: minutes, endTime: Date.now() + minutes * 60000, task, cancelled: false };
  activeSessions.set(id, session);
  ensureGlobalTimer();
  notify("APEX Focus", `Focus session started: ${minutes} minutes${task ? ` — ${task}` : ""}. Lock in, sir.`);
  return session;
}

export function stopFocus(id?: string): boolean {
  if (id) {
    const s = activeSessions.get(id);
    if (s) { s.cancelled = true; activeSessions.delete(id); notify("APEX Focus", "Focus session stopped."); return true; }
    return false;
  }
  for (const [, s] of activeSessions) s.cancelled = true;
  activeSessions.clear();
  notify("APEX Focus", "All focus sessions stopped.");
  return true;
}

export function getSessionStatus(): string {
  const sessions = [...activeSessions.values()].filter(s => !s.cancelled && Date.now() < s.endTime);
  if (sessions.length === 0) return "No active focus sessions, sir.";
  return `**Active focus sessions:**\n\n${sessions.map(s => `\u2022 **${Math.max(0, Math.ceil((s.endTime - Date.now()) / 60000))} min remaining**${s.task ? ` — ${s.task}` : ""} (ID: \`${s.id}\`)`).join("\n")}`;
}