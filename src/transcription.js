import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureDir } from "./utils.js";

export async function transcribeAudio(filePath, config) {
  if (!config.whisperBin || !config.whisperModelPath) {
    return "";
  }

  const outBase = filePath.replace(path.extname(filePath), "");
  await run(config.whisperBin, ["-m", config.whisperModelPath, "-f", filePath, "-otxt", "-of", outBase]);
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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}
