import { formatDateTime } from "./utils.js";
import { parseReminder } from "./assistant.js";

export function parseCalendarEvent(text, timezone) {
  const cleaned = text.replace(/^(schedule|event|calendar|add event)\s+/i, "").trim();
  const parsed = parseReminder(`remind me ${cleaned}`, timezone);
  if (!parsed) return null;

  return {
    title: parsed.title,
    startsAt: parsed.dueAt,
    endsAt: new Date(Date.parse(parsed.dueAt) + 60 * 60 * 1000).toISOString(),
    source: "telegram"
  };
}

export function listEvents(storage, config) {
  const events = storage
    .listEvents()
    .filter((event) => Date.parse(event.endsAt || event.startsAt) >= Date.now())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 10);

  if (events.length === 0) return "Your local calendar has no upcoming events.";

  const lines = events.map(
    (event) => `${event.id}. ${formatDateTime(new Date(event.startsAt), config.timezone)} - ${event.title}`
  );
  return `Upcoming local calendar events:\n${lines.join("\n")}`;
}
