# Fresh Setup

This is the clean path for setting up PriseClaw from scratch.

PriseClaw is a NanoClaw fork with a small, explicit overlay:

- Telegram channel included
- OpenAI routed through NanoClaw's OpenCode provider
- private-secretary profile guidance
- Raspberry Pi setup notes

No real secrets are committed. Your `.env` stays local on the Raspberry Pi.

## 1. Prepare Raspberry Pi OS

Use Raspberry Pi OS 64-bit or Debian arm64.

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git curl ca-certificates nano unzip rsync docker-compose
```

Docker must be available. If your distro does not already have Docker:

```bash
sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and back in after adding yourself to the `docker` group.

## 2. Clone PriseClaw

```bash
cd /home/ghon
git clone https://github.com/gavinhon/priseclaw.git
cd priseclaw
git remote add upstream https://github.com/qwibitai/nanoclaw.git
```

The expected remotes are:

```text
origin   https://github.com/gavinhon/priseclaw.git
upstream https://github.com/qwibitai/nanoclaw.git
```

## 3. Configure Secrets Locally

```bash
cp .env.example .env
nano .env
```

Set:

```env
TELEGRAM_BOT_TOKEN=...
OPENAI_API_KEY=...
NANOCLAW_AGENT_PROVIDER=opencode
OPENCODE_PROVIDER=openai
OPENCODE_MODEL=openai/gpt-5.4-mini
OPENCODE_SMALL_MODEL=openai/gpt-5.4-mini
ANTHROPIC_BASE_URL=https://api.openai.com/v1
```

Then protect it:

```bash
mkdir -p data/env
cp .env data/env/env
chmod 600 .env data/env/env
```

## 4. Install And Build

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install
pnpm run typecheck
pnpm run build
bash container/build.sh
```

## 5. Run Setup

```bash
bash nanoclaw.sh
```

During setup:

1. Use Telegram as the channel.
2. Reuse your bot token from `.env`.
3. Pair your own Telegram account.
4. Name the assistant `PriseClaw`.

Because Telegram is already included in this fork, setup should report the adapter as already installed.

## 6. Give The Secretary Profile

After Telegram pairing succeeds, message the bot:

```text
Remember this as your operating profile:
You are PriseClaw, my private personal secretary. Help me manage reminders, notes, local calendar items, follow-ups, and briefings. Use scheduled tasks for reminders. Store durable notes as Markdown. Do not access email. Do not message other people unless I explicitly confirm.
```

## Reset Local Pi State

To re-run setup from a clean local state while preserving `.env`:

```bash
cd /home/ghon/priseclaw
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p "/home/ghon/priseclaw-local-backups/$ts"
cp .env "/home/ghon/priseclaw-local-backups/$ts/.env"
mv data logs store "/home/ghon/priseclaw-local-backups/$ts/" 2>/dev/null || true
git reset --hard origin/main
git clean -fd -e .env
mkdir -p data/env
cp .env data/env/env
chmod 600 .env data/env/env
pnpm install
pnpm run typecheck
pnpm run build
bash nanoclaw.sh
```

## Verify No Secrets Are Tracked

Before pushing:

```bash
git status --short
git ls-files | grep -E '(^|/)(\.env$|data/env|store/|logs/)'
```

The second command should print nothing.
