import fs from "node:fs";
import path from "node:path";
import { ensureDir, formatDateKey } from "./utils.js";

export function exportObsidian(storage, config) {
  const root = storage.obsidianDir;
  const notesDir = path.join(root, "Notes");
  const remindersDir = path.join(root, "Reminders");
  const calendarDir = path.join(root, "Calendar");
  ensureDir(notesDir);
  ensureDir(remindersDir);
  ensureDir(calendarDir);

  const noteCount = exportNotes(storage.listNotes(), notesDir, config);
  const reminderCount = exportReminders(storage.listReminders(), remindersDir, config);
  const eventCount = exportEvents(storage.listEvents(), calendarDir, config);

  return { root, noteCount, reminderCount, eventCount };
}

function exportNotes(notes, dir, config) {
  for (const note of notes) {
    const date = formatDateKey(new Date(note.createdAt), config.timezone);
    const file = path.join(dir, `${date}-notes.md`);
    appendMarkdown(file, `- ${note.content} ^note-${note.id}\n`);
  }
  return notes.length;
}

function exportReminders(reminders, dir, config) {
  const file = path.join(dir, "reminders.md");
  const lines = reminders
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .map((reminder) => {
      const box = reminder.status === "done" ? "x" : " ";
      return `- [${box}] ${reminder.title} (${reminder.dueAt}) #reminder/${reminder.status} ^reminder-${reminder.id}`;
    });
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return reminders.length;
}

function exportEvents(events, dir) {
  const file = path.join(dir, "calendar.md");
  const lines = events
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((event) => `- ${event.startsAt} - ${event.title} ^event-${event.id}`);
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return events.length;
}

function appendMarkdown(file, line) {
  ensureDir(path.dirname(file));
  if (!fs.existsSync(file)) fs.writeFileSync(file, "", "utf8");
  const existing = fs.readFileSync(file, "utf8");
  if (!existing.includes(line.trim())) fs.appendFileSync(file, line, "utf8");
}
