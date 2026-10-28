# KovaaLab CRM Agent Skills

Official [Agent Skills](https://skills.sh/) for building KovaaLab CRM apps, shared by the `skills` CLI and the Codex plugin named `kovaa-lab`.

This package owns the five canonical skills, shared references, and Codex metadata. One build produces a distribution with self-contained skill directories for both installation methods. Generated files live in ignored `dist/` locally and on the `agent-skills` publishing branch, never in the source tree on `main`.

## Installation

### Agent Skills

Install into Claude Code, Codex, Cursor, Pi, or any other harness supported by the `skills` CLI:

```bash
# List the available skills
npx skills add https://github.com/kovaa-lab/kovaa-lab/tree/agent-skills --list

# Install one skill
npx skills add https://github.com/kovaa-lab/kovaa-lab/tree/agent-skills --skill create-app
npx skills add https://github.com/kovaa-lab/kovaa-lab/tree/agent-skills --skill develop-app

# Install everything
npx skills add https://github.com/kovaa-lab/kovaa-lab/tree/agent-skills --skill '*'
```

The CLI prompts for target agents, or accepts `--agent` (for example `--agent claude-code`, `--agent codex`, or `--agent '*'`). Each installed skill includes the references it needs.

**First publish:** the `agent-skills` branch is created by the first successful publish from `main`. Before that workflow has run, use the [local build](#local-development) below. The source package on `main` is not directly installable with the `skills` CLI because its references are shared across skills.

Use the branch URL above to select the app-development collection. The bare `kovaa-lab/kovaa-lab` repository also contains contributor and app-specific skills; see the repository's [`SKILLS.md`](https://github.com/kovaa-lab/kovaa-lab/blob/main/SKILLS.md) for those audiences.

### Codex Plugin

Search for “KovaaLab CRM” in the Codex plugin directory and install. The plugin keeps its public identifier, `kovaa-lab`, and consumes the same built distribution as the `skills` CLI. It also includes the public KovaaLab CRM documentation MCP server and a workspace MCP setup helper.

For a checkout or an unpublished change, use the local marketplace instructions below.

## Skills

| Skill                                                | Use it for                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`create-app`](./skills/create-app/SKILL.md)         | Scaffold a new KovaaLab CRM app with `kovaa-lab app init`.                                     |
| [`develop-app`](./skills/develop-app/SKILL.md)       | Add or modify objects, fields, logic functions, layouts, front components, workflows. |
| [`manage-app`](./skills/manage-app/SKILL.md)         | Manage remotes, sync, build, deploy, logs, troubleshooting, CI/CD.                    |
| [`publish-app`](./skills/publish-app/SKILL.md)       | Prepare README, marketplace metadata, logos, screenshots, public assets.              |
| [`use-kovaa-lab-mcp`](./skills/use-kovaa-lab-mcp/SKILL.md) | Connect to a workspace over MCP and present records as readable Markdown.             |

The four app-development skills work without MCP setup. Self-hosted instances, custom HTTPS domains, and localhost HTTP URLs are supported. Workspace URLs and credentials stay user-local.

Cross-skill operating rules live in [`references/concepts/operating-rules.md`](./references/concepts/operating-rules.md). [`AGENTS.md`](./AGENTS.md) adds Codex-specific routing and wrapper guidance.

## MCP Setup

The Codex plugin bundles the public `kovaa-lab-docs` server for searching official KovaaLab CRM documentation. Workspace data access requires each user's own MCP endpoint in their private client configuration.

From a repository checkout:

```bash
bash packages/kovaa-lab-agent-skills/scripts/setup-mcp.sh myworkspace.kovaa-lab.com
```

The helper accepts KovaaLab CRM subdomains, custom domains, and localhost. It normalizes the URL to an `/mcp` endpoint and names the server after its host, such as `kovaa-lab-myworkspace`. Codex may open OAuth automatically; if it does not, run `codex mcp login <server-name>`. Use `--force-login` only for terminal-only setup.

Equivalent manual setup:

```bash
codex mcp add kovaa-lab-myworkspace --url https://myworkspace.kovaa-lab.com/mcp
codex mcp login kovaa-lab-myworkspace
```

The same helper is included at `scripts/setup-mcp.sh` in the built distribution. For other clients, see [`references/use-kovaa-lab-mcp/setup.md`](./references/use-kovaa-lab-mcp/setup.md).

Workspace MCP URLs and ChatGPT app declarations are user-local. This distribution ships no `.app.json`; a workspace MCP URL alone is not a ChatGPT connector ID.

## Local Development

Run from the repository root:

```bash
# Validate canonical skills and Codex metadata
npx nx run kovaa-lab-agent-skills:validate

# Build the shared distribution into ignored dist/
npx nx run kovaa-lab-agent-skills:build

# Install from that distribution
npx skills add ./packages/kovaa-lab-agent-skills/dist --skill create-app

# Run build and validation tests
npx nx run kovaa-lab-agent-skills:test
```

For local Codex plugin installation, build first, then copy the marketplace template (or merge its entry into an existing config):

```bash
mkdir -p .agents/plugins
cp packages/kovaa-lab-agent-skills/templates/marketplace.example.json .agents/plugins/marketplace.json
```

The template points at `./packages/kovaa-lab-agent-skills/dist`. Enable it through the Codex plugin manager. Adjust the path if the marketplace config is outside this checkout.

Edit `skills/` and `references/` directly; they are the canonical source. Keep content harness-neutral and Codex-specific settings in `.codex-plugin/`, `.mcp.json`, `agents/openai.yaml`, and `scripts/setup-mcp.sh`. Rebuild after edits; do not commit `dist/`.

The publish workflow builds and validates `main`, then publishes `dist/` at the root of the `agent-skills` branch. Pull requests validate the distribution without publishing it. See [`CONTRIBUTING.md`](https://github.com/kovaa-lab/kovaa-lab/blob/main/packages/kovaa-lab-agent-skills/CONTRIBUTING.md) for the full checks and release process, [`CHECKLIST.md`](https://github.com/kovaa-lab/kovaa-lab/blob/main/packages/kovaa-lab-agent-skills/CHECKLIST.md) for Codex checks, and [`CHANGELOG.md`](https://github.com/kovaa-lab/kovaa-lab/blob/main/packages/kovaa-lab-agent-skills/CHANGELOG.md) for changes.

Installation is checked in CI. The workflow against a running self-hosted KovaaLab CRM instance is checked separately; see [`SMOKE-TEST.md`](https://github.com/kovaa-lab/kovaa-lab/blob/main/packages/kovaa-lab-agent-skills/SMOKE-TEST.md) for the procedure and its recorded run.
