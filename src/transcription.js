import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureDir } from "./utils.js";

export async function transcribeAudio(filePath, config) {
  if (!config.whisperBin || !config.whisperModelPath) {
    return "";
  }

  if (!fs.existsSync(config.whisperBin)) {
    throw new Error(`WHISPER_CPP_BIN does not exist: ${config.whisperBin}`);
  }

  if (!fs.existsSync(config.whisperModelPath)) {
    throw new Error(`WHISPER_MODEL_PATH does not exist: ${config.whisperModelPath}`);
  }

  const outBase = filePath.replace(path.extname(filePath), "");
  const wavPath = `${outBase}.wav`;
  await convertToWhisperWav(filePath, wavPath, config);
  await run(config.whisperBin, ["-m", config.whisperModelPath, "-f", wavPath, "-otxt", "-of", outBase]);
  const txtPath = `${outBase}.txt`;
  if (!fs.existsSync(txtPath)) return "";
  return fs.readFileSync(txtPath, "utf8").trim();
}

export async function saveTelegramFile({ telegram, fileId, audioDir }) {
  ensureDir(audioDir);
  const fileInfo = await telegram.getFile(fileId);
  const extension = path.extname(fileInfo.file_path || "") || ".ogg";
  const safeName = `${Date.now()}-${fileId.replace(/[^a-zA-Z0-9_-]/g, "")}${extension}`;
  const dest = path.join(audioDir, safeName);
  await telegram.downloadFile(fileInfo.file_path, dest);
  return dest;
}

async function convertToWhisperWav(inputPath, wavPath, config) {
  await run(config.ffmpegBin || "ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    wavPath
  ]);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}: ${stderr.trim().slice(-1000)}`));
    });
  });
}
