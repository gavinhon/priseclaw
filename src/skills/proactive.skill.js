import { describeProactiveChecks, proactiveNow } from "../proactive.js";

export const proactiveSkill = {
  name: "proactive",
  description: "Let PriseClaw initiate bounded check-ins from local context.",
  examples: ["proactive status", "proactive now"],
  canHandle({ lower }) {
    return lower === "proactive status" || lower === "proactive now";
  },
  async run({ lower, storage, config }) {
    if (lower === "proactive status") return describeProactiveChecks();
    return proactiveNow(storage, config);
  }
};
