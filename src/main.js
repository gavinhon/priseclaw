import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleText } from "./assistant.js";
import { getConfig } from "./config.js";
import { Scheduler } from "./scheduler.js";
import { Storage } from "./storage.js";
import { TelegramBot } from "./telegram.js";
import { saveTelegramFile, transcribeAudio } from "./transcription.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = getConfig(rootDir);
const storage = new Storage(config.dataDir);

const telegram = new TelegramBot({
  token: config.telegramToken,
  allowedUserIds: config.allowedUserIds,
  discoveryMode: config.discoveryMode,
  storage
});

const scheduler = new Scheduler({ storage, config, telegram });

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("PriseClaw starting.");
console.log(`Data directory: ${config.dataDir}`);
console.log(`Allowed Telegram users: ${config.allowedUserIds.length}`);
console.log(`Discovery mode: ${config.discoveryMode ? "on" : "off"}`);

scheduler.start();
await telegram.start(async (message) => {
  const text = await extractText(message);
  storage.addMessage({
    channel: "telegram",
    senderId: message.from?.id,
    chatId: message.chat?.id,
    text,
    telegramMessageId: message.message_id
  });

  const reply = await handleText({ text, storage, config });
  await telegram.sendMessage(message.chat.id, reply);
});

async function extractText(message) {
  if (message.text) return message.text;

  const voice = message.voice || message.audio || null;
  if (voice?.file_id) {
    const audioPath = await saveTelegramFile({
      telegram,
      fileId: voice.file_id,
      audioDir: storage.audioDir
    });
    try {
      const transcript = await transcribeAudio(audioPath, config);
      if (transcript) return transcript;
      return `Voice note saved locally at ${audioPath}, but transcription is not configured.`;
    } catch (error) {
      storage.addAudit({
        type: "voice_transcription_failed",
        audioPath,
        error: error.message
      });
      return `Voice note saved locally at ${audioPath}, but transcription failed: ${error.message}`;
    }
  }

  return "Unsupported message type.";
}

function shutdown() {
  console.log("PriseClaw stopping.");
  scheduler.stop();
  telegram.stop();
  process.exit(0);
}
