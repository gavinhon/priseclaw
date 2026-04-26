import { exportObsidian } from "../markdown.js";

export const markdownSkill = {
  name: "markdown",
  description: "Export local notes, reminders, and calendar events as Obsidian-compatible Markdown.",
  examples: ["export obsidian", "export markdown"],
  canHandle({ lower }) {
    return lower === "export obsidian" || lower === "export markdown";
  },
  async run({ storage, config }) {
    const exported = exportObsidian(storage, config);
    return `Exported to ${exported.root}: ${exported.noteCount} notes, ${exported.reminderCount} reminders, ${exported.eventCount} events.`;
  }
};
