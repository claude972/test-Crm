---
name: publish-app
description: Use when the user wants to prepare or verify a KovaaLab CRM app for npm or marketplace publication, including README/About copy, package metadata, defineApplication marketplace metadata, logos, screenshots, and public assets.
---

# When To Use

Pick this skill when the user wants to make an existing KovaaLab CRM app _presentable_ — listing copy, branding, public assets, and publication. Representative triggers:

- "prepare my KovaaLab CRM app for the marketplace"
- "write the README for my KovaaLab CRM app"
- "publish my app to npm"
- "add a logo / screenshots / marketplace metadata"
- "set up `defineApplication` marketplace fields"
- "review my app listing before going live"
- "ship a new version of my published app"

Do not use this skill to scaffold (use `create-app`), to change app entities (use `develop-app`), to deploy a private build to a specific KovaaLab CRM server (use `manage-app`), or to query workspace records (use `use-kovaa-lab-mcp`).

# Publishing Checklist

For background on how KovaaLab CRM apps work — the SDK packages, remotes, sync lifecycle, and rendering model — read `../../references/concepts/how-apps-work.md`. Cross-skill operating rules that apply to every KovaaLab CRM app task are in `../../references/concepts/operating-rules.md`; they are authoritative and not restated per skill.

Use `../../references/publish-app/prepare-for-app-store.md` for detailed README, marketplace copy, logo, screenshot, and public asset guidance.

Keep the skill workflow concise:

- Inspect `package.json`, `README.md`, `src/application-config.ts`, and `public/`.
- For npm marketplace publication, ensure `package.json` has a valid bumped `version` and the `kovaa-lab-app` keyword.
- In `defineApplication()`, verify marketplace-facing fields such as `displayName`, `description`, `author`, `category`, `logo`, `galleryImages`, `aboutDescription`, `websiteUrl`, `termsUrl`, `emailSupport`, and `issueReportUrl`.
- Keep `logo` and `galleryImages` pointed at files in `public/`. Public assets must not contain secrets, private data, customer records, real tokens, or unreleased confidential material.
- Remember that if `aboutDescription` is omitted, the marketplace uses the package `README.md` from npm for the About content. The About tab renders markdown text only: images and raw HTML are not rendered.
- Validate with `kovaa-lab app build`; publish with `kovaa-lab app publish` or `kovaa-lab app publish --tag <tag>`.

# Boundaries

Use `$manage-app` for remotes, deploys to a specific server, logs, troubleshooting, and CI/CD operations.

Use `$develop-app` when the app entities themselves need to change before the listing can be accurate.

# Docs

If the needed publishing detail is unclear, search the official KovaaLab CRM docs at `https://docs.kovaa-lab.com` before guessing. When a KovaaLab CRM docs MCP server is configured (`https://docs.kovaa-lab.com/mcp`), prefer searching through it. That server is an optional enhancement, not a requirement for this skill.
