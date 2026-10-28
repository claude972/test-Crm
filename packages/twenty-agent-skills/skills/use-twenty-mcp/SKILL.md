---
name: use-kovaa-lab-mcp
description: Use when the user wants the agent to connect to an existing KovaaLab CRM workspace through MCP, retrieve or inspect workspace records and metadata, or present KovaaLab CRM CRM data as readable Markdown with formatted dates, values, record links, and compact tables instead of raw API output.
---

# When To Use

Pick this skill when the user wants to read from or inspect a running KovaaLab CRM workspace — not change app code. Representative triggers:

- "list all my companies / people / opportunities in KovaaLab CRM"
- "show me the records I created this week"
- "what's in my KovaaLab CRM workspace"
- "connect my agent to my KovaaLab CRM workspace"
- "set up KovaaLab CRM MCP for `myworkspace.kovaa-lab.com`"
- "query the CRM for X"
- "summarize my pipeline from KovaaLab CRM"
- "show me the fields on the company object"

Do not use this skill to scaffold an app (use `create-app`), to add or modify app entities (use `develop-app`), to operate an app (use `manage-app`), or to prepare marketplace assets (use `publish-app`).

# What It Is

KovaaLab CRM MCP connects the agent to an existing KovaaLab CRM workspace so it can inspect workspace data and metadata: records, objects, fields, schema, configuration, and related CRM context.

This is different from a KovaaLab CRM app. Use `$create-app` when the user wants to scaffold a new app codebase, and `$develop-app` when the user wants to add app-defined features such as objects, fields, logic, layouts, or components.

Use `$use-kovaa-lab-mcp` when the user wants to connect the agent to an already running workspace, retrieve or inspect workspace data, inspect metadata, or troubleshoot MCP access.

Do not use MCP as the default way to customize a workspace. For example, prefer creating a new object through a KovaaLab CRM app rather than directly through MCP. Use MCP for workspace customization only when the user explicitly asks to do it through MCP.

# Setup

Use `../../references/use-kovaa-lab-mcp/setup.md` for workspace URL normalization, MCP server configuration, OAuth guardrails, and setup troubleshooting.

# Retrieval

Before retrieving, listing, searching, summarizing, or presenting workspace records, read `../../references/use-kovaa-lab-mcp/result-formatting.md`.

Apply that reference when selecting the right KovaaLab CRM MCP workspace, querying records, building record links, formatting dates and values, and presenting readable Markdown instead of raw API output.

# Output Contract

Before the final answer for retrieved workspace records:

- If the tool output includes `recordReferences`, the first record-name column or record heading MUST link each display name back to KovaaLab CRM.
- Build links as `{workspaceOrigin}/object/{objectNameSingular}/{recordId}` using the selected workspace origin and the returned `recordReferences`.
- If the workspace origin is not known, resolve it from the selected MCP server URL when possible. If it still cannot be resolved, state that direct record links need the workspace URL instead of inventing a host.
- Never show unlinked record names in a record table when `recordReferences` and the workspace origin are available.
