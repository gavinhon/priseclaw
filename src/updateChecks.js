import crypto from "node:crypto";
import fs from "node:fs";

export async function runDueUpdateChecks(storage, config, force = false) {
  const checks = loadChecks();
  const state = storage.getUpdateState();
  const now = Date.now();
  const notices = [];

  for (const check of checks.filter((item) => item.enabled !== false)) {
    const interval = minutes(check.intervalMinutes || config.updateCheckIntervalMinutes || 15);
    const lastChecked = Date.parse(state[check.id]?.lastCheckedAt || "1970-01-01T00:00:00Z");
    if (!force && now - lastChecked < interval) continue;

    try {
      const result = await runCheck(check);
      const previous = state[check.id]?.fingerprint || "";
      state[check.id] = {
        lastCheckedAt: new Date().toISOString(),
        fingerprint: result.fingerprint,
        summary: result.summary
      };
      if (previous && previous !== result.fingerprint) {
        notices.push(`Update: ${check.name}\n${result.summary}`);
      }
      if (!previous && check.notifyOnFirstRun) {
        notices.push(`Tracking started: ${check.name}\n${result.summary}`);
      }
    } catch (error) {
      state[check.id] = {
        ...(state[check.id] || {}),
        lastCheckedAt: new Date().toISOString(),
        lastError: error.message
      };
    }
  }

  storage.saveUpdateState(state);
  return notices;
}

export function describeUpdateChecks() {
  const checks = loadChecks();
  if (checks.length === 0) return "No update checks are configured. Edit config/update-checks.json.";
  return checks
    .map((check) => `${check.id}: ${check.name} (${check.type}, ${check.enabled === false ? "disabled" : "enabled"})`)
    .join("\n");
}

function loadChecks() {
  try {
    const url = new URL("../config/update-checks.json", import.meta.url);
    return JSON.parse(fs.readFileSync(url, "utf8"));
  } catch {
    return [];
  }
}

async function runCheck(check) {
  if (check.type === "website") return checkWebsite(check);
  if (check.type === "rss") return checkRss(check);
  if (check.type === "github") return checkGithub(check);
  throw new Error(`Unsupported update check type: ${check.type}`);
}

async function checkWebsite(check) {
  const response = await fetch(check.url, { signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  return {
    fingerprint: hash(text),
    summary: `${check.url} changed. HTTP ${response.status}.`
  };
}

async function checkRss(check) {
  const response = await fetch(check.url, { signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  const title = firstMatch(text, /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/i)
    || firstMatch(text, /<item>[\s\S]*?<title>(.*?)<\/title>/i)
    || firstMatch(text, /<entry>[\s\S]*?<title.*?>(.*?)<\/title>/i)
    || "RSS feed updated";
  return {
    fingerprint: hash(title),
    summary: `${check.name}: ${decodeXml(title)}`
  };
}

async function checkGithub(check) {
  const repo = check.repo;
  const mode = check.mode || "commits";
  const url =
    mode === "releases"
      ? `https://api.github.com/repos/${repo}/releases/latest`
      : `https://api.github.com/repos/${repo}/commits/${check.branch || "main"}`;
  const response = await fetch(url, {
    headers: { "user-agent": "priseclaw" },
    signal: AbortSignal.timeout(20_000)
  });
  const json = await response.json();
  const fingerprint = mode === "releases" ? json.tag_name || json.id : json.sha;
  const summary = mode === "releases" ? `${repo} latest release: ${json.tag_name}` : `${repo} latest commit: ${json.sha?.slice(0, 7)} ${json.commit?.message?.split("\n")[0] || ""}`;
  return { fingerprint, summary };
}

function hash(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function minutes(value) {
  return Number(value) * 60 * 1000;
}

function firstMatch(text, regex) {
  return text.match(regex)?.[1]?.trim();
}

function decodeXml(text) {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
