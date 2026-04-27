# PriseClaw

PriseClaw is a private personal secretary bot for Telegram, designed to run on a Raspberry Pi.

It is a fork of [NanoClaw](https://github.com/qwibitai/nanoclaw), keeping NanoClaw's containerized agent runtime while making a small opinionated setup for personal use:

- Telegram is included as the primary private chat channel.
- OpenAI is used through NanoClaw's OpenCode provider path.
- Local notes, reminders, follow-ups, and calendar-style records are kept in the agent workspace.
- Email access is intentionally not included.
- Real secrets stay in `.env` on the Raspberry Pi and are not committed.

## Quick Start

On a clean Raspberry Pi:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git curl ca-certificates nano unzip rsync docker-compose

git clone https://github.com/gavinhon/priseclaw.git
cd priseclaw
cp .env.example .env
nano .env

bash nanoclaw.sh
```

Set these values in `.env`:

```env
TELEGRAM_BOT_TOKEN=replace_with_your_bot_token_from_botfather
OPENAI_API_KEY=replace_with_your_openai_api_key
NANOCLAW_AGENT_PROVIDER=opencode
OPENCODE_PROVIDER=openai
OPENCODE_MODEL=openai/gpt-5.4-mini
OPENCODE_SMALL_MODEL=openai/gpt-5.4-mini
ANTHROPIC_BASE_URL=https://api.openai.com/v1
```

Full setup guide: [docs/fresh-setup.md](docs/fresh-setup.md).

## What PriseClaw Is For

PriseClaw is meant to be a personal secretary that can:

- keep private notes
- remember follow-ups
- maintain a local Markdown calendar
- schedule reminders and recurring reminders
- send briefings or check-ins
- store Obsidian-friendly Markdown files
- answer through a private Telegram DM

After setup, send the bot this message:

```text
Remember this as your operating profile:
You are PriseClaw, my private personal secretary. Help me manage reminders, notes, local calendar items, follow-ups, and briefings. Use scheduled tasks for reminders. Store durable notes as Markdown. Do not access email. Do not message other people unless I explicitly confirm.
```

## Privacy Model

PriseClaw keeps the same runtime split as NanoClaw:

```text
Raspberry Pi host
  runs the service, Telegram adapter, local database, Docker, and OneCLI vault

Agent container
  runs the assistant work in an isolated Docker container
```

API keys should stay outside the agent container. OneCLI acts as the local credential vault/proxy for approved outbound API requests.

Keep the bot in a private Telegram DM first. Do not add it to group chats until you have reviewed the permissions and behavior.

## Repository Layout

Important PriseClaw-specific files:

```text
.env.example                         safe local env template
README.md                            this overview
docs/fresh-setup.md                  clean Raspberry Pi setup
docs/priseclaw-customizations.md     what differs from upstream NanoClaw
docs/priseclaw-private-secretary.md  secretary profile notes
container/skills/private-secretary/  secretary skill guidance
```

Important inherited NanoClaw areas:

```text
src/                                 host service, routing, channels, provider wiring
container/agent-runner/              container-side agent runtime
setup/                               interactive setup flow
nanoclaw.sh                          main setup entrypoint
```

## Maintaining The Fork

PriseClaw should stay close to NanoClaw. The intended overlay is small:

- Telegram included by default
- OpenAI/OpenCode provider wiring
- private-secretary profile docs and skill
- Raspberry Pi setup documentation

See [docs/priseclaw-customizations.md](docs/priseclaw-customizations.md) before upgrading from upstream NanoClaw.

## Fresh Setup And Reset

For a new Raspberry Pi, follow:

```text
docs/fresh-setup.md
```

For resetting local Pi runtime state while keeping `.env`, use the reset section in that same guide.

## Secrets

Never commit:

```text
.env
data/
logs/
store/
groups/*/CLAUDE.local.md
```

Before pushing:

```bash
git status --short
git ls-files | grep -E '(^|/)(\.env$|data/env|store/|logs/)'
```

The second command should print nothing.

## Upstream

PriseClaw is built on NanoClaw:

```text
https://github.com/qwibitai/nanoclaw
```

NanoClaw provides the core containerized agent architecture, setup flow, scheduler, channel/provider registry, and OneCLI credential integration. PriseClaw adds a narrow personal-secretary setup on top.

## License

MIT
