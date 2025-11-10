# Claude Workshop Skills

Curated Claude MCP skills ready for live workshops and self-serve setup. The repository mirrors the structure of `~/.claude` so attendees can copy everything, cherry-pick a single skill, or script their own install flow with the GitHub CLI.

## Repository Layout

```
.
├── skills/                 # Skill definitions plus reference docs
├── hooks/                  # Bun-powered approval hooks for certain skills
├── settings/               # Claude hook wiring (JSON) and supporting packages
├── mcp/                    # MCP server definitions (Chrome DevTools)
└── scripts/                # Helper utilities for selective installs
```

## Skill Index

| Skill | Summary | Supporting Files | Notes |
| --- | --- | --- | --- |
| `chrome-devtools` | Automate Chrome via the DevTools Protocol (navigation, interaction, tracing). | `skills/chrome-devtools/**`<br>`hooks/hooks.chrome-devtools.ts`<br>`settings/settings.chrome-devtools.json`<br>`mcp/mcp.chrome-devtools.json` | Add `Skill(chrome-devtools)` to `settings.json`. Requires `bun` to execute hooks and launch the MCP server. |
| `diagram` | Maintain Diagram Driven Development assets and references. | `skills/diagram/**` | Optionally whitelist with `Skill(diagram)` in `settings.json`. |
| `github` | Manage GitHub issues end-to-end with `gh`. | `skills/github/**`<br>`hooks/hooks.github.ts`<br>`settings/settings.github.json` | Ensure `Skill(github)` is allowed in `settings.json`. Requires the GitHub CLI (`gh`). |
| `review` | Persona-driven code review orchestrator (Fowler, Torvalds, Carmack, etc.). | `skills/review/**` | Keep `Skill(review)` in `settings.json` so Claude can load reviewer personas. |

## Prerequisites

- GitHub CLI (`gh`) authenticated for the attendee.
- `bun` installed and on `PATH` for skills that invoke Bun hooks (currently Chrome DevTools and GitHub).
- `rsync` (or adjust commands to use `cp -R`) for copying into `~/.claude`.

## Quick Start (Full Mirror)

```bash
# Replace with the public repo slug you publish
REPO_SLUG="johnlindquist/claude-workshop-skills"
WORKDIR="$HOME/Downloads/claude-workshop-skills"

# 1. Backup existing Claude config
tar -czf "$HOME/.claude-backup.$(date +%Y%m%d).tgz" -C "$HOME" .claude

# 2. Clone the skills repo
gh repo clone "$REPO_SLUG" "$WORKDIR"

# 3. Copy into ~/.claude (dry run first if desired)
rsync -av --exclude='.git' "$WORKDIR/" "$HOME/.claude/"

# 4. Install hook dependencies
(cd "$HOME/.claude/hooks" && bun install)
(cd "$HOME/.claude/settings" && bun install)
```

Restart Claude (or reload the workspace) so it picks up new skills, hooks, and MCP servers.

## Selective Installation with the Helper Script

After cloning the repository, run the included script to copy everything needed for a single skill:

```bash
REPO_DIR="$HOME/Downloads/claude-workshop-skills"
cd "$REPO_DIR"

# Examples
./scripts/install-skill.sh github
./scripts/install-skill.sh chrome-devtools
```

The script copies the skill folder plus any required hooks, settings, or MCP files into `~/.claude` and reminds attendees to update `settings.json` if needed.

Override the destination with `CLAUDE_HOME`:

```bash
CLAUDE_HOME="$HOME/.claude-workshop" ./scripts/install-skill.sh diagram
```

## `gh` CLI Sparse Checkout (Single Skill Download)

Attendees who only want one skill can fetch just the relevant directories using sparse checkout:

```bash
REPO_SLUG="johnlindquist/claude-workshop-skills"
WORKDIR="$(mktemp -d)"

gh repo clone "$REPO_SLUG" "$WORKDIR" -- --filter=blob:none --sparse
cd "$WORKDIR"

# Pull only what the helper script needs
git sparse-checkout set \
  scripts/install-skill.sh \
  skills/github \
  hooks/hooks.github.ts \
  settings/settings.github.json

# Install the skill
./scripts/install-skill.sh github
```

Swap `skills/github` and the supporting files for whichever skill they want (see the Skill Index table for dependencies). This keeps bandwidth low while still using the helper script to wire everything correctly.

## Manual Selective Copy (No Script)

```bash
REPO_SLUG="johnlindquist/claude-workshop-skills"
WORKDIR="$(mktemp -d)"
gh repo clone "$REPO_SLUG" "$WORKDIR"

# Copy only the diagram skill
rsync -av "$WORKDIR/skills/diagram/" "$HOME/.claude/skills/diagram/"

# If the skill has hooks/settings, copy those too
rsync -av "$WORKDIR/hooks/hooks.github.ts" "$HOME/.claude/hooks/"
rsync -av "$WORKDIR/settings/settings.github.json" "$HOME/.claude/settings/"
```

Edit `~/.claude/settings.json` so the relevant `Skill(...)` entries are allowed, then restart Claude.

## Updating After the Workshop

```bash
REPO_SLUG="johnlindquist/claude-workshop-skills"
WORKDIR="$HOME/Downloads/claude-workshop-skills"

cd "$WORKDIR"
gh repo sync "$REPO_SLUG"
rsync -av --exclude='.git' "$WORKDIR/" "$HOME/.claude/"
```

Sparse-checkout clones can run `git pull` followed by the same `./scripts/install-skill.sh <skill>` command to refresh local copies.

## Troubleshooting

- **Hooks fail with `bun: command not found`**  
  Install Bun from [bun.sh](https://bun.sh) and rerun `bun install` inside `~/.claude/hooks` and `~/.claude/settings`.
- **Skill does not appear in Claude**  
  Append the matching `Skill(...)` entry to `~/.claude/settings.json` and restart Claude so it reloads permissions.
- **Chrome DevTools tools time out**  
  Make sure Chrome is installed, the MCP server in `mcp/mcp.chrome-devtools.json` can launch successfully, and the user grants permission when prompted.
- **GitHub commands prompt for auth**  
  Run `gh auth login` beforehand and confirm the personal access token has the `repo` scope.
- **`install-skill.sh` reports “Unknown skill”**  
  Run the script from the repo root or pass a valid skill name (`chrome-devtools`, `diagram`, `github`, or `review`).
- **Want to roll back to pre-workshop state**  
  Restore the backup tarball generated during Quick Start: `tar -xzf ~/.claude-backup.<date>.tgz -C ~`.

## Closing Thoughts

This repository demonstrates a self-contained way to distribute Claude skills, but it still relies on sharing the global `~/.claude` namespace. We would love to see a future `--strict-skills-config` flag (or similar) that lets Claude load skills from an isolated workspace per project or repo. That capability would simplify workshops, eliminate manual permission edits, and make selective installs even safer for attendees.
