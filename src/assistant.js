import { formatDateTime } from "./utils.js";

const HELP = `I can keep private notes and reminders for you.

Try:
note Ben prefers email
remind me tomorrow at 9 call Ben
remind me on 2026-05-01 at 14:30 submit form
list reminders
what is my day
done 3`;

export async function handleText({ text, storage, config }) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed || lower === "help" || lower === "/start") {
    return HELP;
  }

  if (lower === "list reminders" || lower === "reminders") {
    return listReminders(storage, config);
  }

  if (lower === "what is my day" || lower === "today" || lower === "agenda") {
    return dailyBriefing(storage, config);
  }

  const doneMatch = lower.match(/^done\s+(\d+)$/);
  if (doneMatch) {
    const done = storage.completeReminder(doneMatch[1]);
    return done ? `Marked done: ${done.title}` : `I could not find reminder ${doneMatch[1]}.`;
  }

  if (lower.startsWith("note ") || lower.startsWith("remember ")) {
    const content = trimmed.replace(/^(note|remember)\s+/i, "").trim();
    storage.addNote({ content, source: "telegram" });
    return "Noted privately.";
  }

  if (lower.startsWith("remind me ") || lower.startsWith("reminder ")) {
    const reminder = parseReminder(trimmed, config.timezone);
    if (!reminder) {
      return "I could not confidently parse the reminder time. Try: remind me tomorrow at 9 call Ben.";
    }
    const saved = storage.addReminder(reminder);
    return `Reminder ${saved.id} saved for ${formatDateTime(new Date(saved.dueAt), config.timezone)}: ${saved.title}`;
  }

  const apiAction = await askOnlineReasoner(trimmed, config).catch((error) => {
    storage.addAudit({ type: "online_reasoning_failed", error: error.message });
    return null;
  });
  if (apiAction) {
    for (const note of apiAction.notes || []) {
      if (note.content) storage.addNote({ content: note.content, source: "openai" });
    }
    for (const reminder of apiAction.reminders || []) {
      if (reminder.title && reminder.dueAt) storage.addReminder(reminder);
    }
    if (apiAction.reply) return apiAction.reply;
  }

  storage.addNote({ content: trimmed, source: "telegram", inferred: true });
  return "I saved that as a private note. Say `help` for reminder formats I understand.";
}

export function parseReminder(text, timezone) {
  const cleaned = text.replace(/^remind(er)?\s*(me)?\s*/i, "").trim();
  const now = new Date();

  const isoMatch = cleaned.match(/(?:on\s+)?(\d{4}-\d{2}-\d{2})(?:\s+at\s+|\s+)(\d{1,2})(?::(\d{2}))?\s*(.*)$/i);
  if (isoMatch) {
    const [, date, hour, minute = "00", title] = isoMatch;
    return {
      title: title.trim() || "Reminder",
      dueAt: new Date(`${date}T${hour.padStart(2, "0")}:${minute}:00`).toISOString()
    };
  }

  const tomorrowMatch = cleaned.match(/^tomorrow(?:\s+at\s+(\d{1,2})(?::(\d{2}))?)?\s*(.*)$/i);
  if (tomorrowMatch) {
    const [, hour = "9", minute = "00", title] = tomorrowMatch;
    const due = localDateOffset(now, timezone, 1, Number(hour), Number(minute));
    return { title: title.trim() || "Reminder", dueAt: due.toISOString() };
  }

  const todayMatch = cleaned.match(/^(today|later)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?)?\s*(.*)$/i);
  if (todayMatch) {
    const [, , hour = "18", minute = "00", title] = todayMatch;
    const due = localDateOffset(now, timezone, 0, Number(hour), Number(minute));
    return { title: title.trim() || "Reminder", dueAt: due.toISOString() };
  }

  const inMatch = cleaned.match(/^in\s+(\d+)\s+(minute|minutes|hour|hours|day|days)\s*(.*)$/i);
  if (inMatch) {
    const [, amountText, unit, title] = inMatch;
    const amount = Number(amountText);
    const multiplier = unit.startsWith("minute") ? 60_000 : unit.startsWith("hour") ? 3_600_000 : 86_400_000;
    return {
      title: title.trim() || "Reminder",
      dueAt: new Date(Date.now() + amount * multiplier).toISOString()
    };
  }

  return null;
}

export function dueReminders(storage) {
  const now = Date.now();
  const reminders = storage.listReminders();
  const due = reminders.filter((reminder) => reminder.status === "pending" && Date.parse(reminder.dueAt) <= now);
  if (due.length === 0) return [];

  for (const reminder of due) {
    reminder.status = "sent";
    reminder.sentAt = new Date().toISOString();
  }
  storage.saveReminders(reminders);
  return due;
}

export function dailyBriefing(storage, config) {
  const pending = storage
    .listReminders()
    .filter((reminder) => reminder.status === "pending")
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, 8);

  if (pending.length === 0) return "You have no pending reminders.";

  const lines = pending.map(
    (reminder) => `${reminder.id}. ${formatDateTime(new Date(reminder.dueAt), config.timezone)} - ${reminder.title}`
  );
  return `Your upcoming reminders:\n${lines.join("\n")}`;
}

function listReminders(storage, config) {
  return dailyBriefing(storage, config);
}

function localDateOffset(now, timezone, dayOffset, hour, minute) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T00:00:00`);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function askOnlineReasoner(text, config) {
  if (!config.openaiApiKey) return null;

  const response = await fetch(`${config.openaiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify({
      model: config.openaiModel,
      store: false,
      max_output_tokens: 500,
      instructions: `You are a private personal secretary parser. Return only JSON with this shape:
{"reply":"short confirmation or answer","notes":[{"content":"note text"}],"reminders":[{"title":"task","dueAt":"ISO-8601 date time"}]}

Rules:
- Use the user's timezone: ${config.timezone}.
- Only create reminders when the user clearly asks to be reminded.
- Only create notes when the user asks you to note, remember, or store something.
- If no action is needed, return empty arrays and a short useful reply.
- dueAt must be an ISO-8601 timestamp.`,
      input: text
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const json = await response.json();
  const outputText = extractResponseText(json);
  if (!outputText) return null;
  return JSON.parse(stripJsonFence(outputText));
}

function extractResponseText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("").trim();
}

function stripJsonFence(text) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}
