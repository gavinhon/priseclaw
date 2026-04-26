# PriseClaw Customizations

PriseClaw should stay a small, maintainable fork of NanoClaw.

The rule of thumb:

- upstream NanoClaw owns the runtime
- PriseClaw owns only the OpenAI provider default, private-secretary profile, Raspberry Pi deployment notes, and repo hygiene needed for Linux setup
- real secrets live only in `.env` on the Raspberry Pi

## Upstream Base

Primary upstream:

```text
https://github.com/qwibitai/nanoclaw.git
```

This fork was originally rebased around upstream commit:

```text
0bc082a17cad3064bd9af395a61f1db959b85c1d
```

The Raspberry Pi checkout should have these remotes:

```bash
origin   https://github.com/gavinhon/priseclaw.git
upstream https://github.com/qwibitai/nanoclaw.git
```

## PriseClaw-Owned Files

These files are intentionally PriseClaw-specific:

```text
docs/priseclaw-customizations.md
docs/priseclaw-private-secretary.md
docs/priseclaw-migration.md
container/skills/private-secretary/SKILL.md
.env.example
.gitattributes
```

## PriseClaw Patches To Upstream Files

These are the main upstream files touched by PriseClaw:

```text
README.md
package.json
setup/auto.ts
setup/register.ts
scripts/init-cli-agent.ts
src/group-init.ts
src/providers/index.ts
src/providers/opencode.ts
container/Dockerfile
container/agent-runner/package.json
container/agent-runner/bun.lock
container/agent-runner/src/providers/index.ts
container/agent-runner/src/providers/opencode.ts
container/agent-runner/src/providers/mcp-to-opencode.ts
```

The OpenCode provider files are copied from NanoClaw's `providers` branch, then PriseClaw adds OpenAI-friendly defaults and setup behavior.

## OpenAI Instead Of Claude

PriseClaw uses OpenAI through NanoClaw's OpenCode provider path.

Required local `.env` values:

```env
OPENAI_API_KEY=sk-...
NANOCLAW_AGENT_PROVIDER=opencode
OPENCODE_PROVIDER=openai
OPENCODE_MODEL=openai/gpt-4.1-mini
OPENCODE_SMALL_MODEL=openai/gpt-4.1-mini
ANTHROPIC_BASE_URL=https://api.openai.com/v1
```

`setup/auto.ts` detects this and registers the OpenAI key with OneCLI instead of forcing the Claude/Anthropic prompt.

## Secretary Profile

The secretary behavior is not hardcoded into a Telegram bot. It is carried as NanoClaw-compatible profile guidance:

```text
container/skills/private-secretary/SKILL.md
docs/priseclaw-private-secretary.md
```

After setup, tell the agent to remember the secretary operating profile in its workspace memory.

## Secrets Policy

Never commit:

```text
.env
.env.*
data/
data/env/env
groups/
logs/
store/
```

These are covered by `.gitignore`. Use `.env.example` only for placeholder values.

Note: upstream NanoClaw tracks template files such as `groups/global/CLAUDE.md` and `groups/main/CLAUDE.md`. Those are repository defaults, not local runtime state. Do not add `CLAUDE.local.md`, personal notes, real calendars, or generated group files.

Audit before pushing:

```bash
git status --short
git ls-files | grep -E '(^|/)(\.env|data/env|store/|logs/)'
git diff --cached
```

The second command should show only `.env.example` if anything env-like appears.

## Upgrade Procedure

On a development machine:

```bash
git fetch upstream main providers channels
git checkout main
git status --short
```

Make sure the worktree is clean, then merge or rebase upstream NanoClaw:

```bash
git merge upstream/main
```

After resolving conflicts, re-check the PriseClaw overlay:

```bash
pnpm install
pnpm run typecheck
pnpm run build
git diff --name-only upstream/main HEAD
```

Pay special attention to conflicts in:

```text
setup/auto.ts
setup/register.ts
src/group-init.ts
src/providers/
container/agent-runner/src/providers/
container/Dockerfile
```

On the Raspberry Pi:

```bash
cd /home/ghon/priseclaw
git pull --ff-only
pnpm install
pnpm run typecheck
pnpm run build
bash container/build.sh
```

Then run setup only if channel/provider/service wiring changed:

```bash
bash nanoclaw.sh
```
