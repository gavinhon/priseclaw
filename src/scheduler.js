import { dailyBriefing, dueReminders } from "./assistant.js";
import { runProactiveChecks } from "./proactive.js";
import { runDueUpdateChecks } from "./updateChecks.js";
import { getLocalParts, todayKey } from "./utils.js";

export class Scheduler {
  constructor({ storage, config, telegram }) {
    this.storage = storage;
    this.config = config;
    this.telegram = telegram;
    this.lastBriefingKey = "";
    this.updateCheckRunning = false;
    this.proactiveRunning = false;
  }

  start() {
    this.tick();
    this.timer = setInterval(() => this.tick(), 30_000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    await this.sendDueReminders();
    await this.sendDailyBriefing();
    await this.sendUpdateCheckNotices();
    await this.sendProactiveMessages();
  }

  async sendDueReminders() {
    const due = dueReminders(this.storage);
    for (const reminder of due) {
      await this.telegram.broadcastAllowed(`Reminder ${reminder.id}: ${reminder.title}`);
    }
  }

  async sendDailyBriefing() {
    const parts = getLocalParts(new Date(), this.config.timezone);
    const nowHHMM = `${parts.hour}:${parts.minute}`;
    const key = todayKey(this.config.timezone);
    if (nowHHMM !== this.config.dailyBriefingTime || this.lastBriefingKey === key) return;

    this.lastBriefingKey = key;
    await this.telegram.broadcastAllowed(dailyBriefing(this.storage, this.config));
  }

  async sendUpdateCheckNotices() {
    if (this.updateCheckRunning) return;
    this.updateCheckRunning = true;
    try {
      const notices = await runDueUpdateChecks(this.storage, this.config);
      for (const notice of notices) {
        await this.telegram.broadcastAllowed(notice);
      }
    } finally {
      this.updateCheckRunning = false;
    }
  }

  async sendProactiveMessages() {
    if (this.proactiveRunning) return;
    this.proactiveRunning = true;
    try {
      const messages = await runProactiveChecks(this.storage, this.config);
      for (const message of messages) {
        await this.telegram.broadcastAllowed(message);
      }
    } finally {
      this.proactiveRunning = false;
    }
  }
}
