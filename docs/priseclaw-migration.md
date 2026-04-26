# PriseClaw Migration To NanoClaw

This repository has been rebased around upstream NanoClaw.

Upstream source:

```text
https://github.com/qwibitai/nanoclaw
```

Imported upstream commit:

```text
0bc082a17cad3064bd9af395a61f1db959b85c1d
```

## Why

The original intent was not to build a new Telegram bot from scratch. The intent was to learn NanoClaw and shape it into a private personal secretary.

The first custom PriseClaw implementation proved out:

- Telegram allowlisting
- Raspberry Pi service deployment
- local voice transcription with `whisper.cpp`
- reminders
- local calendar-like data
- Obsidian-style Markdown export
- update-check ideas

But it did not preserve NanoClaw's real architecture:

- isolated agent containers
- channel/provider install skills
- container-side skills
- scheduler that wakes agents
- OneCLI credential proxy
- per-agent-group workspace and memory

So the project is now a NanoClaw fork.

## Removed

The following old custom files were removed:

```text
src/main.js
src/assistant.js
src/telegram.js
src/storage.js
src/scheduler.js
src/transcription.js
src/skills/
config/
DEPLOYMENT.md
GIST.md
scripts/run-rpi.sh
scripts/install-rpi.sh
scripts/install-service-rpi.sh
scripts/run-windows.ps1
```

## Added

PriseClaw-specific additions now live as NanoClaw-compatible docs and skills:

```text
docs/priseclaw-private-secretary.md
docs/priseclaw-migration.md
container/skills/private-secretary/SKILL.md
```

## Expected Setup

Use NanoClaw's setup:

```bash
bash nanoclaw.sh
```

Choose Telegram as the first channel, pair your own account, and name the first agent `PriseClaw`.

## Dependency Change

Old PriseClaw needed only Node.js.

PriseClaw's NanoClaw base needs:

- Node.js 20+
- pnpm 10+
- Docker
- OneCLI
- OpenAI API credentials through OpenCode/OneCLI, or Claude/Anthropic credentials if you choose to switch back to the upstream default

The setup script handles most of this on a clean Linux/Raspberry Pi install.

## Verification Notes

On the Windows development workspace:

```text
pnpm install
pnpm run typecheck
pnpm run build
```

passed after migration.

`pnpm test` currently reaches the upstream test suite but fails on Windows-specific environment behavior:

- `commandExists('node')` returns false under this Windows shell
- several SQLite scheduling tests hit `EBUSY` when deleting temporary DB files

Re-run the suite on the Raspberry Pi/Linux environment after setup for the more representative signal.

## Data Migration

Do not copy old `data/reminders.json` directly into NanoClaw.

Instead:

1. Open the old data files if you need them.
2. Send important notes/reminders to the new Telegram agent.
3. Ask it to store notes in Markdown or schedule reminders using NanoClaw's scheduler.
