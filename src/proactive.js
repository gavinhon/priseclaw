import fs from "node:fs";
import { formatDateTime, getLocalParts, todayKey } from "./utils.js";

export async function runProactiveChecks(storage, config) {
  const settings = loadProactiveConfig();
  if (!settings.enabled) return [];

  const state = storage.getProactiveState();
  const notices = [];
  const now = new Date();

  for (const checkIn of settings.checkIns || []) {
    if (checkIn.enabled === false) continue;
    if (!isTimeNow(checkIn.time, now, config.timezone)) continue;
    const key = `${todayKey(config.timezone)}:${checkIn.id}`;
    if (state[key]) continue;
    const message = await buildCheckInMessage({ checkIn, storage, config });
    state[key] = new Date().toISOString();
    notices.push(message);
  }

  const stale = settings.staleReminderNudge || {};
  if (stale.enabled !== false && isTimeNow(stale.time || "18:00", now, config.timezone)) {
    const key = `${todayKey(config.timezone)}:stale-reminder-nudge`;
    if (!state[key]) {
      const message = buildStaleReminderNudge(storage, config, Number(stale.minimumAgeHours || 24));
      state[key] = new Date().toISOString();
      if (message) notices.push(message);
    }
  }

  storage.saveProactiveState(state);
  return notices;
}

export function describeProactiveChecks() {
  const settings = loadProactiveConfig();
  const lines = [`Proactive mode: ${settings.enabled ? "enabled" : "disabled"}`];
  for (const checkIn of settings.checkIns || []) {
    lines.push(`${checkIn.id}: ${checkIn.enabled === false ? "disabled" : "enabled"} at ${checkIn.time}`);
  }
  if (settings.staleReminderNudge) {
    lines.push(
      `staleReminderNudge: ${settings.staleReminderNudge.enabled === false ? "disabled" : "enabled"} at ${settings.staleReminderNudge.time || "18:00"}`
    );
  }
  return lines.join("\n");
}

export async function proactiveNow(storage, config) {
  return buildCheckInMessage({
    checkIn: {
      id: "manual",
      prompt: "Start a useful short check-in with the user based on their local reminders, calendar, and notes."
    },
    storage,
    config
  });
}

function loadProactiveConfig() {
  try {
    const url = new URL("../config/proactive.json", import.meta.url);
    return JSON.parse(fs.readFileSync(url, "utf8"));
  } catch {
    return { enabled: false, checkIns: [] };
  }
}

async function buildCheckInMessage({ checkIn, storage, config }) {
  const context = localContext(storage, config);
  const apiMessage = await askOnlineForCheckIn(checkIn.prompt, context, config).catch((error) => {
    storage.addAudit({ type: "proactive_reasoning_failed", error: error.message });
    return "";
  });
  if (apiMessage) return apiMessage;

  const next = context.nextItem ? ` Next up: ${context.nextItem}.` : "";
  return `Checking in: ${checkIn.prompt}${next}`;
}

function buildStaleReminderNudge(storage, config, minimumAgeHours) {
  const cutoff = Date.now() - minimumAgeHours * 60 * 60 * 1000;
  const stale = storage
    .listReminders()
    .filter((reminder) => reminder.status === "pending" && Date.parse(reminder.createdAt || reminder.dueAt) <= cutoff)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, 5);
  if (stale.length === 0) return "";
  const lines = stale.map(
    (reminder) => `${reminder.id}. ${formatDateTime(new Date(reminder.dueAt), config.timezone)} - ${reminder.title}`
  );
  return `A few reminders have been sitting for a while. Still relevant?\n${lines.join("\n")}`;
}

function localContext(storage, config) {
  const reminders = storage
    .listReminders()
    .filter((reminder) => reminder.status === "pending")
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, 5);
  const events = storage
    .listEvents()
    .filter((event) => Date.parse(event.startsAt) >= Date.now())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 5);
  const notes = storage.listNotes().slice(-5);
  const nextReminder = reminders[0]
    ? `${formatDateTime(new Date(reminders[0].dueAt), config.timezone)} - ${reminders[0].title}`
    : "";
  const nextEvent = events[0]
    ? `${formatDateTime(new Date(events[0].startsAt), config.timezone)} - ${events[0].title}`
    : "";
  return {
    nextItem: nextReminder || nextEvent,
    reminders,
    events,
    recentNotes: notes
  };
}

async function askOnlineForCheckIn(prompt, context, config) {
  if (!config.openaiApiKey) return "";
  const response = await fetch(`${config.openaiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify({
      model: config.openaiModel,
      store: false,
      max_output_tokens: 180,
      instructions: `You are PriseClaw, a private personal secretary. Write one short proactive Telegram message. Do not invent facts. Ask at most one question. The user wants useful, bounded autonomy.`,
      input: JSON.stringify({ prompt, context })
    }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const json = await response.json();
  return extractResponseText(json);
}

function extractResponseText(response) {
  if (typeof response.output_text === "string") return response.output_text.trim();
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("").trim();
}

function isTimeNow(target, now, timezone) {
  const parts = getLocalParts(now, timezone);
  return `${parts.hour}:${parts.minute}` === target;
}
