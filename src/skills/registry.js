import { calendarSkill } from "./calendar.skill.js";
import { helpSkill } from "./help.skill.js";
import { markdownSkill } from "./markdown.skill.js";
import { notesSkill } from "./notes.skill.js";
import { proactiveSkill } from "./proactive.skill.js";
import { remindersSkill } from "./reminders.skill.js";
import { searchSkill } from "./search.skill.js";
import { updatesSkill } from "./updates.skill.js";

const skills = [
  helpSkill,
  remindersSkill,
  calendarSkill,
  notesSkill,
  searchSkill,
  markdownSkill,
  updatesSkill,
  proactiveSkill
];

export function listSkills() {
  return skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    examples: skill.examples || []
  }));
}

export async function runMatchingSkill(context) {
  for (const skill of skills) {
    if (skill.canHandle(context)) {
      return skill.run(context);
    }
  }
  return null;
}

export function skillsHelp() {
  return skills
    .map((skill) => {
      const examples = (skill.examples || []).slice(0, 3).map((example) => `  ${example}`).join("\n");
      return `${skill.name}: ${skill.description}${examples ? `\n${examples}` : ""}`;
    })
    .join("\n\n");
}
