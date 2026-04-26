# PriseClaw

PriseClaw is a privacy-first personal secretary bot designed to run on a Raspberry Pi. It accepts Telegram text messages and voice notes, stores everything locally, keeps notes, schedules reminders, sends a daily briefing, and can optionally use `whisper.cpp` for local voice transcription plus an online API for reasoning.

For a gist-style project overview, see [GIST.md](GIST.md).

## Privacy Model

- Telegram access is blocked unless the sender's numeric user ID is in `ALLOWED_TELEGRAM_USER_IDS`.
- Discovery mode is temporary and only prints sender IDs to the server console.
- Messages, notes, reminders, and audio are stored under `data/` on your own machine.
- The bot works without an LLM. If `OPENAI_API_KEY` is configured, message text/transcripts can be sent to the online API for richer reasoning.
- The bot does not expose a web dashboard by default.
- Risky operations are not implemented yet: no email sending, no calendar mutation outside the local store.

Telegram itself can still see messages passing through Telegram. If online reasoning is enabled, the selected API provider receives the text/transcript needed for reasoning. This version makes sure other Telegram users cannot interact with or read your bot state.

## Quick Start on Windows

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Add `TELEGRAM_BOT_TOKEN`.
4. Set `DISCOVERY_MODE=true`.
5. Run:

```powershell
.\scripts\run-windows.ps1
```

6. Message your bot. Copy your numeric user ID from the console.
7. Set `ALLOWED_TELEGRAM_USER_IDS=your_id` and `DISCOVERY_MODE=false`.
8. Restart the bot.

## Raspberry Pi Deployment

For the detailed checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

Yes, deploy the whole project folder to the Raspberry Pi. The Pi needs the `src/`, `config/`, `scripts/`, `package.json`, `.env.example`, `README.md`, `DEPLOYMENT.md`, and `GIST.md` files. The `data/` folder is created on the Pi when the bot runs.

On the Pi:

```bash
git clone https://github.com/gavinhon/priseclaw.git
cd priseclaw
cp .env.example .env
nano .env
./scripts/install-rpi.sh
./scripts/run-rpi.sh
```

To install as a systemd service:

```bash
sudo ./scripts/install-service-rpi.sh
sudo systemctl status priseclaw
```

If someone downloads this repo as a ZIP instead of using GitHub clone, unzip the full folder on the Pi, then follow [DEPLOYMENT.md](DEPLOYMENT.md) from Phase 5 onward.

FTP/SFTP upload is also fine. Create this folder on the Pi:

```text
/home/pi/priseclaw
```

Upload the project files there. Do not upload or overwrite `data/`, `.env`, `node_modules/`, or `*.log` during normal updates. Full FTP/SFTP instructions and Raspberry Pi maintenance commands are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Commands

Use natural language. The parser is intentionally conservative.

```text
note Ben prefers email, not calls
remind me tomorrow at 9 call Ben about the contract
remind me every Monday at 9 review goals
remind me on 2026-05-01 at 14:30 submit the form
schedule lunch with Ben next Tuesday at 12
calendar
search Ben
export obsidian
update checks
check updates now
what is my day
list reminders
done 3
help
```

Voice notes are downloaded locally. If `WHISPER_CPP_BIN` and `WHISPER_MODEL_PATH` are configured, they are transcribed and processed like text.

## Bounded Autonomy

PriseClaw can do scheduled work on its own, but only from explicit local configuration:

- one-time and recurring reminders
- daily briefing
- local calendar events in `data/events.json`
- Obsidian-compatible Markdown export under `data/obsidian/`
- local search across notes, reminders, and events
- optional website, RSS, and GitHub update checks from `config/update-checks.json`

It does not access email, message other people, or run arbitrary tools.

## Data Files

```text
data/
  messages.jsonl
  notes.jsonl
  reminders.json
  events.json
  update-state.json
  audit.jsonl
  audio/
  obsidian/
```

Back up the `data/` directory if you want to preserve history.
