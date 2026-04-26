import fs from "node:fs";
import path from "node:path";

export function loadEnv(rootDir) {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getConfig(rootDir) {
  loadEnv(rootDir);

  const dataDir = path.resolve(rootDir, process.env.DATA_DIR || "./data");
  const allowedUserIds = (process.env.ALLOWED_TELEGRAM_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return {
    rootDir,
    dataDir,
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
    allowedUserIds,
    discoveryMode: parseBool(process.env.DISCOVERY_MODE),
    timezone: process.env.BOT_TIMEZONE || "Asia/Singapore",
    dailyBriefingTime: process.env.DAILY_BRIEFING_TIME || "08:00",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    whisperBin: process.env.WHISPER_CPP_BIN || "",
    whisperModelPath: process.env.WHISPER_MODEL_PATH || ""
  };
}

function parseBool(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}
