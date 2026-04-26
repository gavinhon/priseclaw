import { exportObsidian } from "./markdown.js";
import { searchHistory } from "./search.js";
import { describeUpdateChecks, runDueUpdateChecks } from "./updateChecks.js";
import { formatDateTime } from "./utils.js";

const HELP = `I can keep private notes and reminders for you.

Try:
note Ben prefers email
remind me tomorrow at 9 call Ben
remind me every Monday at 9 review goals
remind me on 2026-05-01 at 14:30 submit form
schedule lunch with Ben next Tuesday at 12
calendar
search Ben
export obsidian
update checks
check updates now
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

  if (lower === "calendar" || lower === "events" || lower === "list events") {
    return listEvents(storage, config);
  }

  if (lower === "export obsidian" || lower === "export markdown") {
    const exported = exportObsidian(storage, config);
    return `Exported to ${exported.root}: ${exported.noteCount} notes, ${exported.reminderCount} reminders, ${exported.eventCount} events.`;
  }

  if (lower === "update checks") {
    return describeUpdateChecks();
  }

  if (lower === "check updates now") {
    const notices = await runDueUpdateChecks(storage, config, true);
    return notices.length ? notices.join("\n\n") : "Update checks ran. No changes detected.";
  }

  const searchMatch = trimmed.match(/^search\s+(.+)$/i);
  if (searchMatch) {
    return searchHistory(storage, searchMatch[1].trim(), config);
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

  if (/^(schedule|event|calendar|add event)\s+/i.test(trimmed)) {
    const event = parseEvent(trimmed, config.timezone);
    if (!event) return "I could not confidently parse the event time. Try: schedule lunch with Ben next Tuesday at 12.";
    const saved = storage.addEvent(event);
    return `Event ${saved.id} saved for ${formatDateTime(new Date(saved.startsAt), config.timezone)}: ${saved.title}`;
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

  const recurring = parseRecurringReminder(cleaned, now, timezone);
  if (recurring) return recurring;

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

  const relativeDayMatch = cleaned.match(/\b(today|tomorrow|later)\b/i);
  if (relativeDayMatch) {
    const dayWord = relativeDayMatch[1].toLowerCase();
    const timeMatch = cleaned.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    const defaultHour = dayWord === "today" || dayWord === "later" ? 18 : 9;
    const hour = timeMatch ? parseHour(timeMatch[1], timeMatch[3]) : defaultHour;
    const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 0;
    const dayOffset = dayWord === "tomorrow" ? 1 : 0;
    const due = localDateOffset(now, timezone, dayOffset, hour, minute);
    const title = cleaned
      .replace(relativeDayMatch[0], " ")
      .replace(timeMatch?.[0] || "", " ")
      .replace(/^to\s+/i, "")
      .replace(/\s+/g, " ")
      .replace(/\s+([.,!?])$/g, "$1")
      .replace(/[.,!?]+$/g, "")
      .trim();
    return { title: title || "Reminder", dueAt: due.toISOString() };
  }

  const weekdayMatch = cleaned.match(/\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (weekdayMatch) {
    const weekday = weekdayMatch[2].toLowerCase();
    const timeMatch = cleaned.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    const hour = timeMatch ? parseHour(timeMatch[1], timeMatch[3]) : 9;
    const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 0;
    const dayOffset = daysUntilWeekday(now, timezone, weekday, Boolean(weekdayMatch[1]));
    const due = localDateOffset(now, timezone, dayOffset, hour, minute);
    const title = cleaned
      .replace(weekdayMatch[0], " ")
      .replace(timeMatch?.[0] || "", " ")
      .replace(/^to\s+/i, "")
      .replace(/\s+/g, " ")
      .replace(/[.,!?]+$/g, "")
      .trim();
    return { title: title || "Reminder", dueAt: due.toISOString() };
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
    reminder.sentAt = new Date().toISOString();
    if (reminder.recurrence) {
      reminder.lastDueAt = reminder.dueAt;
      reminder.dueAt = nextRecurringDue(reminder.dueAt, reminder.recurrence);
    } else {
      reminder.status = "sent";
    }
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

  const events = storage
    .listEvents()
    .filter((event) => Date.parse(event.startsAt) >= Date.now())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 5);

  if (pending.length === 0 && events.length === 0) return "You have no pending reminders or upcoming local calendar events.";

  const reminderLines = pending.map(
    (reminder) => `${reminder.id}. ${formatDateTime(new Date(reminder.dueAt), config.timezone)} - ${reminder.title}`
  );
  const eventLines = events.map(
    (event) => `${event.id}. ${formatDateTime(new Date(event.startsAt), config.timezone)} - ${event.title}`
  );
  return [
    reminderLines.length ? `Upcoming reminders:\n${reminderLines.join("\n")}` : "",
    eventLines.length ? `Local calendar:\n${eventLines.join("\n")}` : ""
  ].filter(Boolean).join("\n\n");
}

function listReminders(storage, config) {
  return dailyBriefing(storage, config);
}

function parseEvent(text, timezone) {
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

function parseRecurringReminder(cleaned, now, timezone) {
  const normalized = cleaned.replace(/^to\s+/i, "");
  const dailyMatch = normalized.match(/^every\s+(day|daily)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\s+(.+)$/i);
  if (dailyMatch) {
    const [, , hourText = "9", minuteText = "00", meridiem, title] = dailyMatch;
    const due = nextDailyDue(now, timezone, parseHour(hourText, meridiem), Number(minuteText));
    return {
      title: title.trim(),
      dueAt: due.toISOString(),
      recurrence: { frequency: "daily", interval: 1 }
    };
  }

  const weeklyMatch = normalized.match(/^every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\s+(.+)$/i);
  if (weeklyMatch) {
    const [, weekday, hourText = "9", minuteText = "00", meridiem, title] = weeklyMatch;
    const hour = parseHour(hourText, meridiem);
    const minute = Number(minuteText);
    let dayOffset = daysUntilWeekday(now, timezone, weekday.toLowerCase(), false);
    let due = localDateOffset(now, timezone, dayOffset, hour, minute);
    if (Date.parse(due.toISOString()) <= Date.now()) {
      dayOffset = dayOffset === 0 ? 7 : dayOffset;
      due = localDateOffset(now, timezone, dayOffset, hour, minute);
    }
    return {
      title: title.trim(),
      dueAt: due.toISOString(),
      recurrence: { frequency: "weekly", interval: 1, weekday: weekday.toLowerCase() }
    };
  }

  return null;
}

function nextDailyDue(now, timezone, hour, minute) {
  let due = localDateOffset(now, timezone, 0, hour, minute);
  if (Date.parse(due.toISOString()) <= Date.now()) {
    due = localDateOffset(now, timezone, 1, hour, minute);
  }
  return due;
}

function nextRecurringDue(dueAt, recurrence) {
  const due = new Date(dueAt);
  if (recurrence.frequency === "daily") {
    due.setDate(due.getDate() + Number(recurrence.interval || 1));
  } else if (recurrence.frequency === "weekly") {
    due.setDate(due.getDate() + 7 * Number(recurrence.interval || 1));
  } else if (recurrence.frequency === "monthly") {
    due.setMonth(due.getMonth() + Number(recurrence.interval || 1));
  }
  while (due.getTime() <= Date.now()) {
    if (recurrence.frequency === "daily") due.setDate(due.getDate() + Number(recurrence.interval || 1));
    else if (recurrence.frequency === "weekly") due.setDate(due.getDate() + 7 * Number(recurrence.interval || 1));
    else if (recurrence.frequency === "monthly") due.setMonth(due.getMonth() + Number(recurrence.interval || 1));
    else break;
  }
  return due.toISOString();
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

function parseHour(hourText, meridiem) {
  let hour = Number(hourText);
  if (!meridiem) return hour;
  const normalized = meridiem.toLowerCase();
  if (normalized === "pm" && hour < 12) hour += 12;
  if (normalized === "am" && hour === 12) hour = 0;
  return hour;
}

function daysUntilWeekday(now, timezone, weekday, explicitNext) {
  const weekdays = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  const current = weekdayNumber(now, timezone);
  const target = weekdays[weekday];
  let offset = (target - current + 7) % 7;
  if (offset === 0) offset = explicitNext ? 7 : 0;
  return offset;
}

function weekdayNumber(now, timezone) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long"
  })
    .format(now)
    .toLowerCase();
  return {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  }[name];
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
