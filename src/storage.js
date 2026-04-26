import path from "node:path";
import { appendJsonl, ensureDir, nextId, readJsonFile, writeJsonFile } from "./utils.js";

export class Storage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.messagesPath = path.join(dataDir, "messages.jsonl");
    this.notesPath = path.join(dataDir, "notes.jsonl");
    this.auditPath = path.join(dataDir, "audit.jsonl");
    this.remindersPath = path.join(dataDir, "reminders.json");
    this.audioDir = path.join(dataDir, "audio");
    ensureDir(this.audioDir);
  }

  addMessage(message) {
    appendJsonl(this.messagesPath, { ...message, createdAt: new Date().toISOString() });
  }

  addAudit(event) {
    appendJsonl(this.auditPath, { ...event, createdAt: new Date().toISOString() });
  }

  addNote(note) {
    appendJsonl(this.notesPath, { id: Date.now(), ...note, createdAt: new Date().toISOString() });
  }

  listReminders() {
    return readJsonFile(this.remindersPath, []);
  }

  saveReminders(reminders) {
    writeJsonFile(this.remindersPath, reminders);
  }

  addReminder(reminder) {
    const reminders = this.listReminders();
    const saved = {
      id: nextId(reminders),
      status: "pending",
      createdAt: new Date().toISOString(),
      ...reminder
    };
    reminders.push(saved);
    this.saveReminders(reminders);
    return saved;
  }

  completeReminder(id) {
    const reminders = this.listReminders();
    const found = reminders.find((reminder) => Number(reminder.id) === Number(id));
    if (!found) return null;
    found.status = "done";
    found.completedAt = new Date().toISOString();
    this.saveReminders(reminders);
    return found;
  }
}
