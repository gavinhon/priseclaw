export const helpSkill = {
  name: "help",
  description: "Show available PriseClaw skills and example messages.",
  examples: ["help", "skills"],
  canHandle({ lower }) {
    return !lower || lower === "help" || lower === "/start" || lower === "skills";
  },
  async run({ api }) {
    return `PriseClaw skills:\n\n${api.skillsHelp()}`;
  }
};
