# PriseClaw Private Secretary Profile

PriseClaw is now a NanoClaw fork, not a separate lightweight Telegram bot.

The goal is:

- learn NanoClaw's real architecture
- keep the assistant private
- run it on a Raspberry Pi
- use Telegram as the first channel
- avoid email access
- use NanoClaw's native containerized agent, skills, scheduled tasks, and per-agent memory

## What Changed

The earlier custom PriseClaw implementation has been removed:

- custom `src/main.js`
- custom Telegram polling bot
- custom JSON reminder scheduler
- custom local skill router
- custom `config/proactive.json`
- custom `config/update-checks.json`
- old Raspberry Pi scripts

Those were useful learning scaffolding, but NanoClaw already has the real runtime:

- host router
- channel adapters
- per-session SQLite stores
- agent containers
- container-side skills
- scheduled tasks
- OneCLI credential proxy
- isolated group workspaces

## What Stays Conceptually

The desired product direction stays the same:

- private personal secretary
- Telegram-first
- voice-note capable where the chosen channel supports it
- local memory and files
- scheduled reminders and briefings
- optional web/RSS/GitHub checks through NanoClaw task scripts
- Obsidian-compatible notes through mounted folders or agent-created Markdown
- no email access

## Clean Setup On Raspberry Pi

Use Raspberry Pi OS 64-bit.

Recommended:

- Raspberry Pi 5, 8GB RAM
- SSD boot
- stable power supply

Minimum:

- Raspberry Pi 4, 4GB RAM
- good SD card or SSD

Install base packages:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git curl ca-certificates nano unzip rsync docker-compose
```

If the repo is public, clone this fork:

```bash
git clone https://github.com/gavinhon/priseclaw.git
cd priseclaw
```

If the repo is private or you are copying it over as the project owner, upload the project folder or a zip archive to the Pi and place it at:

```text
/home/ghon/priseclaw
```

For FTP/SFTP deployments, copy the whole project folder contents except local dependency/build caches:

```text
copy:
  package.json
  pnpm-lock.yaml
  nanoclaw.sh
  setup.sh
  setup/
  src/
  container/
  docs/
  data/env/        # only if you intentionally manage env here
  .env            # private owner-only file, never commit this

do not copy:
  node_modules/
  dist/
  logs/
  .git/           # optional; omit when deploying an archive
```

After copying, SSH into the Pi and run:

```bash
cd /home/ghon/priseclaw
find . -type f \( -name '*.sh' -o -name 'nanoclaw.sh' -o -path './.husky/*' -o -path './.claude/skills/*/scripts/*' \) -print0 | xargs -0 sed -i 's/\r$//'
chmod +x nanoclaw.sh setup.sh setup/*.sh container/*.sh 2>/dev/null || true
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install
pnpm run typecheck
pnpm run build
mkdir -p data/env
cp .env data/env/env
```

Run NanoClaw setup:

```bash
bash nanoclaw.sh
```

The setup flow installs or checks:

- Node.js 20+
- pnpm 10+
- Docker
- OneCLI
- service files
- the selected channel
- your first agent

`nanoclaw.sh` is intentionally interactive. Run it from an SSH terminal you can watch because it may ask you to choose a channel, authenticate an online model provider, paste a Telegram token, and send a pairing code to the bot.

## Telegram-First Private Setup

During setup:

1. Choose Telegram when asked for the first channel.
2. Create a bot through `@BotFather`.
3. Paste the Telegram bot token into setup.
4. Pair your Telegram account.
5. Name the first agent `PriseClaw`.
6. Choose owner/admin role for yourself.

Do not add the bot to group chats at first. Keep it as a private DM until you are happy with the behavior.

Privacy checklist:

- Keep `TELEGRAM_BOT_TOKEN` only in `.env` and `data/env/env`.
- Pair only your own Telegram account as the owner.
- Do not invite the bot into public or shared group chats.
- If you later add group chats, keep NanoClaw's unknown-sender policy strict or approval-based.
- Keep `/home/ghon/priseclaw` owned by the Pi user and do not make `.env` world-readable.

```bash
chmod 600 /home/ghon/priseclaw/.env /home/ghon/priseclaw/data/env/env
```

## No Email Access

Do not install email-related channels or integrations.

Avoid:

```text
/add-resend
/add-gmail
email sending integrations
```

If you later want notification-only email summaries, add them as a separate explicit skill with read-only scope. That is intentionally not part of this setup.

## Private Secretary Behavior

Once the Telegram DM works, send the agent this instruction:

```text
Remember this as your operating profile:
You are PriseClaw, my private personal secretary. Help me keep track of reminders, calendar-like commitments, notes, follow-ups, and local knowledge. Prefer concise replies. Ask clarifying questions when a date or action is ambiguous. Do not access email. Do not send messages to other people unless I explicitly ask and confirm. Use scheduled tasks for reminders and briefings. Store durable notes as Markdown in your workspace.
```

NanoClaw will store the instruction in the agent's memory/workspace instead of relying on the old hardcoded parser.

## Online Model Provider

PriseClaw should not run a local LLM on the Raspberry Pi. Use an online provider.

This PriseClaw fork is wired for NanoClaw's OpenCode provider so it can use an OpenAI API key instead of requiring Claude/Anthropic.

Recommended `.env` values:

```env
OPENAI_API_KEY=sk-...
NANOCLAW_AGENT_PROVIDER=opencode
OPENCODE_PROVIDER=openai
OPENCODE_MODEL=openai/gpt-4.1-mini
OPENCODE_SMALL_MODEL=openai/gpt-4.1-mini
ANTHROPIC_BASE_URL=https://api.openai.com/v1
```

The `ANTHROPIC_BASE_URL` name is inherited from NanoClaw/OpenCode's provider bridge; for this setup it points to OpenAI's API base URL.

During setup, PriseClaw detects `OPENAI_API_KEY`, registers it with OneCLI for `api.openai.com`, and skips the Claude auth prompt. Keep the key on the Pi only; do not commit it.

## Reminders And Briefings

Use NanoClaw's native scheduled tasks:

```text
Remind me every Monday at 9am to review goals.
```

```text
Every weekday at 8:30am, send me a short morning briefing based on my reminders, scheduled tasks, and recent notes.
```

For update checks, ask it to use a pre-check script:

```text
Every hour, check the PriseClaw GitHub repo for new commits. Use a script so you only wake up and message me when the latest commit changes.
```

This follows NanoClaw's design: cheap script first, agent wake only when needed.

## Local Calendar

NanoClaw does not need external calendar access to maintain a private local calendar.

Ask:

```text
Create a local calendar.md file and maintain my appointments there.
```

Then:

```text
Schedule lunch with Ben next Tuesday at 12.
```

The agent should store it in its workspace, usually under the group folder.

## Obsidian Notes

For a simple first version, let the agent create Markdown in its workspace.

Later, mount an Obsidian vault into the agent container using NanoClaw's mount allowlist and group container config. Keep the mount local and explicit.

Recommended vault layout:

```text
PriseClaw/
  inbox/
  reminders/
  calendar/
  people/
  projects/
  daily/
```

## Voice Notes

NanoClaw's architecture supports multimodal/voice workflows through channel adapters and container tools. For Raspberry Pi privacy, prefer local transcription through `whisper.cpp`.

Install host dependencies only if needed:

```bash
sudo apt-get install -y build-essential cmake ffmpeg
```

Then add transcription support as a NanoClaw customization or skill, rather than maintaining the old standalone `transcription.js`.

## Update Checks Without Email

Use scheduled task scripts for:

- websites
- RSS feeds
- GitHub repos
- local files

Example instruction:

```text
Every morning at 8, check my configured RSS feeds and message me only if there are new items. Store the feed list in rss-feeds.md.
```

Avoid email checks unless you explicitly decide to add an email skill later.

## Maintenance

Common commands:

```bash
pnpm run build
pnpm run typecheck
pnpm test
```

Service status depends on the install slug NanoClaw creates. Use setup's status command or:

```bash
bash nanoclaw.sh
```

For logs, follow NanoClaw setup output and `logs/`.

Owner maintenance checklist:

```bash
cd /home/ghon/priseclaw
pnpm install
pnpm run typecheck
pnpm run build
docker image ls | grep nanoclaw
systemctl status priseclaw 2>/dev/null || systemctl --user status priseclaw 2>/dev/null || true
```

When deploying a new archive over FTP/SFTP:

1. Stop the current service if it exists:

   ```bash
   sudo systemctl stop priseclaw 2>/dev/null || systemctl --user stop priseclaw 2>/dev/null || true
   ```

2. Back up the current install and `.env`:

   ```bash
   ts=$(date +%Y%m%d-%H%M%S)
   cp -a /home/ghon/priseclaw "/home/ghon/priseclaw-backup-$ts"
   cp /home/ghon/priseclaw/.env "/home/ghon/priseclaw.env.backup-$ts"
   ```

3. Replace the project files, restore `.env`, and copy it into `data/env/env`.
4. Run `pnpm install`, `pnpm run typecheck`, and `pnpm run build`.
5. Re-run `bash nanoclaw.sh` if setup, pairing, provider, or service wiring changed.

## Migration Notes From Old PriseClaw

Old local data lived under:

```text
data/
```

NanoClaw uses its own state layout:

```text
data/
groups/
store/
logs/
```

Do not blindly copy old JSON reminder files into NanoClaw. Instead, paste important reminders/notes into the Telegram DM and ask PriseClaw to store them in its workspace or schedule them with NanoClaw's native scheduler.
