export const notesSkill = {
  name: "notes",
  description: "Capture private local notes.",
  examples: ["note Ben prefers email", "remember the spare key is in the drawer"],
  canHandle({ lower }) {
    return lower.startsWith("note ") || lower.startsWith("remember ");
  },
  async run({ text, storage }) {
    const content = text.replace(/^(note|remember)\s+/i, "").trim();
    storage.addNote({ content, source: "telegram" });
    return "Noted privately.";
  }
};
