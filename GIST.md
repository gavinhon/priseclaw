# PriseClaw - Private Raspberry Pi Personal Secretary

A privacy-first personal secretary bot that runs on a Raspberry Pi, receives Telegram messages and voice notes, keeps local notes, manages reminders, and optionally uses an online reasoning API when the Pi should not do heavy model work.

---

## What Is This?

PriseClaw is a lightweight self-hosted assistant for personal life admin.

You message it like a secretary:

```text
note Ben prefers email, not calls
remind me tomorrow at 9 call the clinic
what is my day
list reminders
done 3
```

It stores notes and reminders locally on your Raspberry Pi, sends reminders back through Telegram, and can produce a daily briefing.

The design is inspired by NanoClaw's Raspberry Pi assistant idea, but simplified for a practical personal setup:

- one owner
- one private Telegram bot
- local storage
- simple deployment scripts
- online reasoning API optional
- no local LLM requirement

---

## The Core Problem It Solves

Most personal reminders are too small to justify opening a calendar app, but too important to trust to memory.

PriseClaw gives you a private message-first capture point:

1. Send the thought immediately.
2. The Pi stores it locally.
3. The bot turns clear instructions into reminders.
4. It nudges you later.
5. Your notes and reminder history remain on your own machine.

---

## Privacy Design

Privacy is the main design constraint.

- Telegram access is locked to an allowlist of numeric Telegram user IDs.
- Discovery mode is temporary and should be disabled after setup.
- All notes, messages, reminders, audit logs, and audio files are stored under `data/`.
- There is no public web dashboard.
- The bot can run without any LLM provider.
- If online reasoning is enabled, only message text or voice transcripts needed for reasoning are sent to the API.
- OpenAI Responses API calls are made with `store: false`.
- Raw audio remains local unless you choose to send transcripts to the reasoning API.

Important limitation: Telegram itself can see messages that pass through Telegram. For stronger privacy later, the messaging channel can be swapped for Signal, Matrix, or a private local web app.

---

## Architecture

```text
Telegram message / voice note
          |
          v
Allowlist gate
          |
          v
Local message store
          |
          v
Rule-based parser
          |
          +---- optional online reasoning API
          |
          v
Local actions
  - save note
  - create reminder
  - complete reminder
  - produce daily briefing
          |
          v
Telegram reply / reminder
```

---

## Technology Stack

| Component | Purpose |
|---|---|
| Node.js 20 | Bot runtime |
| Telegram Bot API | Private message channel |
| Local JSON/JSONL files | Simple durable storage |
| systemd | Run continuously on Raspberry Pi |
| `whisper.cpp` | Optional local voice transcription |
| OpenAI Responses API | Optional online reasoning |
| Raspberry Pi OS | Target host |

There is intentionally no database server, Docker requirement, or local LLM requirement.

---

## Key Capabilities

### Private Telegram Intake

Only configured Telegram user IDs can interact with the bot.

Unknown users are ignored and recorded in a local audit log.

### Notes

```text
note Jason handles supplier onboarding
remember Mum prefers appointments after lunch
```

Notes are appended to:

```text
data/notes.jsonl
```

### Reminders

Supported examples:

```text
remind me in 10 minutes check the laundry
remind me tomorrow at 9 call Ben
remind me on 2026-05-01 at 14:30 submit the form
```

Reminders are stored locally in:

```text
data/reminders.json
```

### Daily Briefing

At the configured time, the bot sends a short list of upcoming reminders.

```text
DAILY_BRIEFING_TIME=08:00
BOT_TIMEZONE=Asia/Singapore
```

### Voice Notes

Voice notes are downloaded to the Pi.

If `whisper.cpp` is configured, they are transcribed locally and processed like text.

### Optional Online Reasoning

The Pi does not need to run a model.

If `OPENAI_API_KEY` is configured, PriseClaw can ask the online API to interpret more natural instructions and return structured actions.

---

## Project Structure

```text
src/
  main.js            bot entrypoint
  telegram.js        Telegram API and allowlist gate
  assistant.js       notes, reminders, parser, optional reasoning
  scheduler.js       due reminders and daily briefing
  storage.js         local files
  transcription.js   optional whisper.cpp integration
  config.js          .env loading
  utils.js           helpers

scripts/
  install-rpi.sh
  run-rpi.sh
  install-service-rpi.sh
  run-windows.ps1

data/
  messages.jsonl
  notes.jsonl
  reminders.json
  audit.jsonl
  audio/
```

---

## Raspberry Pi Deployment Shape

Clean Pi setup:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git curl ca-certificates nano
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Project setup:

```bash
git clone <your-repo-url> priseclaw
cd priseclaw
cp .env.example .env
nano .env
chmod +x scripts/*.sh
./scripts/install-rpi.sh
./scripts/run-rpi.sh
```

Install as service:

```bash
sudo ./scripts/install-service-rpi.sh
```

Full step-by-step instructions are in `DEPLOYMENT.md`.

---

## Configuration

Minimum private setup:

```text
TELEGRAM_BOT_TOKEN=your_bot_token
ALLOWED_TELEGRAM_USER_IDS=your_numeric_telegram_id
DISCOVERY_MODE=false
DATA_DIR=./data
BOT_TIMEZONE=Asia/Singapore
DAILY_BRIEFING_TIME=08:00
```

Optional online reasoning:

```text
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

Optional voice transcription:

```text
WHISPER_CPP_BIN=/opt/whisper.cpp/build/bin/whisper-cli
WHISPER_MODEL_PATH=/opt/whisper.cpp/models/ggml-base.en.bin
```

---

## Design Decisions

### Why Telegram First?

Telegram bots are easy to run on a Raspberry Pi and simple to secure with a user ID allowlist.

WhatsApp is possible, but WhatsApp Web integrations are more fragile and harder to deploy cleanly.

### Why No Local LLM?

Raspberry Pi hardware is better used for always-on storage, scheduling, and lightweight automation.

Reasoning can be sent to an online API when needed, while the Pi remains the private state holder.

### Why Local Files Instead Of SQLite?

For a first version, JSON and JSONL are easier to inspect, back up, and repair.

SQLite can be added later when reminder recurrence, search, or calendar features become richer.

### Why No Web Dashboard?

The safest dashboard is no dashboard.

The first version keeps the surface area small: Telegram in, local files, Telegram out.

---

## Current Status

Implemented:

- Telegram bot long polling
- Telegram sender allowlist
- discovery mode for finding your Telegram user ID
- local message, note, reminder, and audit storage
- one-time reminders
- daily briefing
- optional voice-note download
- optional `whisper.cpp` transcription
- optional OpenAI-compatible reasoning API
- Raspberry Pi install/run/service scripts
- Windows run script for local testing

Planned next:

- recurring reminders
- better date parsing
- searchable local history
- calendar export/import
- update-check scripts
- encrypted backup helper

