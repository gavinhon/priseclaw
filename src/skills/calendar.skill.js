import { formatDateTime } from "../utils.js";

export const calendarSkill = {
  name: "calendar",
  description: "Maintain a local calendar file without external calendar access.",
  examples: ["schedule lunch with Ben next Tuesday at 12", "calendar"],
  canHandle({ lower }) {
    return lower === "calendar" || lower === "events" || lower === "list events" || /^(schedule|event|calendar|add event)\s+/i.test(lower);
  },
  async run({ text, lower, storage, config, api }) {
    if (lower === "calendar" || lower === "events" || lower === "list events") {
      return listEvents(storage, config);
    }

    const event = parseEvent(text, config.timezone, api);
    if (!event) return "I could not confidently parse the event time. Try: schedule lunch with Ben next Tuesday at 12.";
    const saved = storage.addEvent(event);
    return `Event ${saved.id} saved for ${formatDateTime(new Date(saved.startsAt), config.timezone)}: ${saved.title}`;
  }
};

function parseEvent(text, timezone, api) {
  const cleaned = text.replace(/^(schedule|event|calendar|add event)\s+/i, "").trim();
  const parsed = api.parseReminder(`remind me ${cleaned}`, timezone);
  if (!parsed) return null;
  return {
    title: parsed.title,
    startsAt: parsed.dueAt,
    endsAt: new Date(Date.parse(parsed.dueAt) + 60 * 60 * 1000).toISOString(),
    source: "telegram"
  };
}

function listEvents(storage, config) {
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
