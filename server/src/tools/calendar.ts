import { execSync } from "child_process";

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
  calendar: string;
  isAllDay: boolean;
}

function runAppleScript(script: string): string {
  try {
    return execSync(`osascript -e '${script}'`, { encoding: "utf-8", timeout: 5000 }).trim();
  } catch {
    return "";
  }
}

export function getCalendars(): string[] {
  const raw = runAppleScript(`tell application \"Calendar\" to get name of calendars`);
  if (!raw) return [];
  return raw.split(", ");
}

export function getTodayEvents(): CalendarEvent[] {
  return getEventsForDate(new Date());
}

export function getTomorrowEvents(): CalendarEvent[] {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return getEventsForDate(d);
}

export function getWeekEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    events.push(...getEventsForDate(d));
  }
  return events;
}

function getEventsForDate(date: Date): CalendarEvent[] {
  const d = date.toISOString().split("T")[0];
  const script = `
tell application "Calendar"
  set out to ""
  repeat with cal in calendars
    set calName to name of cal
    repeat with evt in (events of cal whose start date ≥ date "${d}" and start date < date "${d}" + 1 * days)
      set out to out & "---EVENT---" & return
      set out to out & "TITLE:" & (summary of evt) & return
      try
        set out to out & "START:" & (start date of evt) as string & return
      end try
      try
        set out to out & "END:" & (end date of evt) as string & return
      end try
      try
        set out to out & "LOCATION:" & (location of evt) & return
      end try
      try
        set out to out & "NOTES:" & (description of evt) & return
      end try
      try
        set out to out & "ALLDAY:" & (allday event of evt) & return
      end try
      set out to out & "CALENDAR:" & calName & return
    end repeat
  end repeat
  return out
end tell`;

  const raw = runAppleScript(script.replace(/\n/g, " "));
  if (!raw) return [];

  const events: CalendarEvent[] = [];
  const blocks = raw.split("---EVENT---").filter((b) => b.trim());
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const evt: Partial<CalendarEvent> = {};
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      switch (key) {
        case "title": evt.title = val; break;
        case "start": evt.start = val; break;
        case "end": evt.end = val; break;
        case "location": evt.location = val; break;
        case "notes": evt.notes = val; break;
        case "allday": evt.isAllDay = val === "true"; break;
        case "calendar": evt.calendar = val; break;
      }
    }
    if (evt.title) {
      events.push(evt as CalendarEvent);
    }
  }
  return events;
}

export function formatAgenda(events: CalendarEvent[]): string {
  if (events.length === 0) return "No events scheduled, sir.";

  const today = new Date().toISOString().split("T")[0];
  const lines: string[] = [];

  let currentDate = "";
  for (const evt of events) {
    const evtDate = evt.start?.slice(0, 10) || today;
    if (evtDate !== currentDate) {
      currentDate = evtDate;
      const dateStr = evtDate === today ? "Today" : new Date(evtDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      lines.push(`\n**${dateStr}**`);
    }

    let timeStr = "";
    if (!evt.isAllDay && evt.start) {
      const startDate = new Date(evt.start);
      const endDate = evt.end ? new Date(evt.end) : null;
      const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      timeStr = ` ${fmt(startDate)}`;
      if (endDate) timeStr += ` - ${fmt(endDate)}`;
    }

    const location = evt.location ? ` 📍 ${evt.location}` : "";
    lines.push(`• ${evt.title}${timeStr}${location}${evt.calendar ? ` _(${evt.calendar})_` : ""}`);
  }

  return lines.join("\n");
}