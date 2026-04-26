import { describeUpdateChecks, runDueUpdateChecks } from "../updateChecks.js";

export const updatesSkill = {
  name: "updates",
  description: "Run configured website, RSS, and GitHub update checks.",
  examples: ["update checks", "check updates now"],
  canHandle({ lower }) {
    return lower === "update checks" || lower === "check updates now";
  },
  async run({ lower, storage, config }) {
    if (lower === "update checks") return describeUpdateChecks();
    const notices = await runDueUpdateChecks(storage, config, true);
    return notices.length ? notices.join("\n\n") : "Update checks ran. No changes detected.";
  }
};
