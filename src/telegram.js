import fs from "node:fs";

export class TelegramBot {
  constructor({ token, allowedUserIds, discoveryMode, storage }) {
    this.token = token;
    this.allowedUserIds = new Set(allowedUserIds.map(String));
    this.discoveryMode = discoveryMode;
    this.storage = storage;
    this.offset = 0;
    this.running = false;
  }

  async api(method, body) {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(60_000)
    });
    const json = await response.json();
    if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
    return json.result;
  }

  async start(onMessage) {
    if (!this.token) throw new Error("TELEGRAM_BOT_TOKEN is required.");
    if (this.allowedUserIds.size === 0 && !this.discoveryMode) {
      throw new Error("Set ALLOWED_TELEGRAM_USER_IDS or temporarily enable DISCOVERY_MODE=true.");
    }

    this.running = true;
    while (this.running) {
      try {
        const updates = await this.api("getUpdates", {
          offset: this.offset,
          timeout: 50,
          allowed_updates: ["message"]
        });

        for (const update of updates) {
          this.offset = update.update_id + 1;
          if (update.message) await this.handleUpdate(update.message, onMessage);
        }
      } catch (error) {
        console.error(error.message);
        await sleep(3000);
      }
    }
  }

  stop() {
    this.running = false;
  }

  async handleUpdate(message, onMessage) {
    const userId = String(message.from?.id || "");
    const chatId = message.chat?.id;

    if (!this.allowedUserIds.has(userId)) {
      this.storage.addAudit({
        type: "blocked_telegram_sender",
        userId,
        username: message.from?.username || "",
        chatId
      });

      if (this.discoveryMode) {
        console.log(`Discovery: user_id=${userId} username=${message.from?.username || ""} chat_id=${chatId}`);
        await this.sendMessage(chatId, `Discovery mode: your Telegram user ID is ${userId}.`);
      }
      return;
    }

    await onMessage(message);
  }

  async sendMessage(chatId, text) {
    return this.api("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    });
  }

  async broadcastAllowed(text) {
    for (const userId of this.allowedUserIds) {
      await this.sendMessage(userId, text);
    }
  }

  async getFile(fileId) {
    return this.api("getFile", { file_id: fileId });
  }

  async downloadFile(filePath, dest) {
    const response = await fetch(`https://api.telegram.org/file/bot${this.token}/${filePath}`);
    if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
