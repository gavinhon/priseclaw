import { formatDateTime } from "./utils.js";

export function searchHistory(storage, query, config) {
  const needle = query.toLowerCase();
  const results = [];

  for (const note of storage.listNotes()) {
    if (String(note.content || "").toLowerCase().includes(needle)) {
      results.push({
        type: "note",
        date: note.createdAt,
        text: note.content
      });
    }
  }

  for (const reminder of storage.listReminders()) {
    if (String(reminder.title || "").toLowerCase().includes(needle)) {
      results.push({
        type: "reminder",
        date: reminder.dueAt,
        text: `${reminder.title} (${reminder.status})`
      });
    }
  }

  for (const event of storage.listEvents()) {
    if (String(event.title || "").toLowerCase().includes(needle)) {
      results.push({
        type: "event",
        date: event.startsAt,
        text: event.title
      });
    }
  }

  const sorted = results.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 10);
  if (sorted.length === 0) return `No local notes, reminders, or events matched "${query}".`;

  const lines = sorted.map(
    (item) => `${item.type}: ${formatDateTime(new Date(item.date), config.timezone)} - ${item.text}`
  );
  return `Search results for "${query}":\n${lines.join("\n")}`;
}
