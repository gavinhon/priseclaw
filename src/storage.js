import path from "node:path";
import { appendJsonl, ensureDir, nextId, readJsonFile, readJsonlFile, writeJsonFile } from "./utils.js";

export class Storage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.messagesPath = path.join(dataDir, "messages.jsonl");
    this.notesPath = path.join(dataDir, "notes.jsonl");
    this.auditPath = path.join(dataDir, "audit.jsonl");
    this.remindersPath = path.join(dataDir, "reminders.json");
    this.eventsPath = path.join(dataDir, "events.json");
    this.updateStatePath = path.join(dataDir, "update-state.json");
    this.proactiveStatePath = path.join(dataDir, "proactive-state.json");
    this.audioDir = path.join(dataDir, "audio");
    this.obsidianDir = path.join(dataDir, "obsidian");
    ensureDir(this.audioDir);
    ensureDir(this.obsidianDir);
  }

  addMessage(message) {
    appendJsonl(this.messagesPath, { ...message, createdAt: new Date().toISOString() });
  }

  addAudit(event) {
    appendJsonl(this.auditPath, { ...event, createdAt: new Date().toISOString() });
  }

  addNote(note) {
    const saved = { id: Date.now(), ...note, createdAt: new Date().toISOString() };
    appendJsonl(this.notesPath, saved);
    return saved;
  }

  listNotes() {
    return readJsonlFile(this.notesPath);
  }

  listMessages() {
    return readJsonlFile(this.messagesPath);
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

  listEvents() {
    return readJsonFile(this.eventsPath, []);
  }

  saveEvents(events) {
    writeJsonFile(this.eventsPath, events);
  }

  addEvent(event) {
    const events = this.listEvents();
    const saved = {
      id: nextId(events),
      createdAt: new Date().toISOString(),
      ...event
    };
    events.push(saved);
    this.saveEvents(events);
    return saved;
  }

  getUpdateState() {
    return readJsonFile(this.updateStatePath, {});
  }

  saveUpdateState(state) {
    writeJsonFile(this.updateStatePath, state);
  }

  getProactiveState() {
    return readJsonFile(this.proactiveStatePath, {});
  }

  saveProactiveState(state) {
    writeJsonFile(this.proactiveStatePath, state);
  }
}
