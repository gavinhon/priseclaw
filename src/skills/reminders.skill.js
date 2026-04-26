import { formatDateTime } from "../utils.js";

export const remindersSkill = {
  name: "reminders",
  description: "Create, list, complete, and roll forward one-time or recurring reminders.",
  examples: [
    "remind me tomorrow at 9 call Ben",
    "remind me every Monday at 9 review goals",
    "list reminders",
    "done 3"
  ],
  canHandle({ lower }) {
    return (
      lower === "list reminders" ||
      lower === "reminders" ||
      lower === "what is my day" ||
      lower === "today" ||
      lower === "agenda" ||
      /^done\s+\d+$/.test(lower) ||
      lower.startsWith("remind me ") ||
      lower.startsWith("reminder ")
    );
  },
  async run({ text, lower, storage, config, api }) {
    if (lower === "list reminders" || lower === "reminders" || lower === "what is my day" || lower === "today" || lower === "agenda") {
      return api.dailyBriefing(storage, config);
    }

    const doneMatch = lower.match(/^done\s+(\d+)$/);
    if (doneMatch) {
      const done = storage.completeReminder(doneMatch[1]);
      return done ? `Marked done: ${done.title}` : `I could not find reminder ${doneMatch[1]}.`;
    }

    const reminder = api.parseReminder(text, config.timezone);
    if (!reminder) {
      return "I could not confidently parse the reminder time. Try: remind me tomorrow at 9 call Ben.";
    }
    const saved = storage.addReminder(reminder);
    return `Reminder ${saved.id} saved for ${formatDateTime(new Date(saved.dueAt), config.timezone)}: ${saved.title}`;
  }
};
