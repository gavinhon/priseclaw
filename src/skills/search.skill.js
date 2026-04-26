import { searchHistory } from "../search.js";

export const searchSkill = {
  name: "search",
  description: "Search local notes, reminders, and calendar events.",
  examples: ["search Ben", "search Knowledge Graphs"],
  canHandle({ text }) {
    return /^search\s+(.+)$/i.test(text);
  },
  async run({ text, storage, config }) {
    const query = text.match(/^search\s+(.+)$/i)[1].trim();
    return searchHistory(storage, query, config);
  }
};
