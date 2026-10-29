# Development rules

## Before starting
- Read this file, `DESIGN.md`, and any instructions closer to the files being changed.
- Read the existing code and configuration before editing. Preserve established patterns, frameworks, and project structure.
- For non-trivial work, present a concise plan, then implement it.

## Stacks
- For a new web project: Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui, Supabase, Stripe, Vercel, and Resend as required.
- For a new mobile project: Expo, React Native, Expo Router, NativeWind, Zustand, TanStack Query, Supabase, RevenueCat, and EAS Build as required.
- In existing projects, use the project's stack. Do not migrate frameworks or add services merely to match these defaults.

## Implementation
- Prefer existing patterns and files. Write production-ready TypeScript with proper error handling.
- Include applicable loading, error, and empty states, form validation, and accessible interactions.
- Prefer Server Components where the existing framework supports them; use client components for interactions that require them.
- Never expose secrets in client code or commit credentials. Do not leave debugging console.log calls in production code.
- Enable RLS on every new Supabase application table and create policies enforcing the intended ownership or tenant access. Verify authorization for every operation; do not weaken existing policies.
- Follow `DESIGN.md` before generating or changing UI.

## Delivery loop
1. Read instructions and relevant code.
2. Plan non-trivial work.
3. Implement.
4. Self-check design rules, loading/error/empty states, validation, accessibility, authorization, RLS, and secrets.
5. Fix issues and run checks appropriate to the change. Iterate until functional and clean.
6. Briefly report changes, validation, and any remaining limitations. Do not claim unperformed checks passed.

## Skills
- Shared user skills are installed with `npx skills add <repository> -g -a claude-code codex` using symlinks.
- Apply only skills relevant to the task. Existing project instructions and the user's explicit requirements take precedence over skill defaults.

## GitHub & Online Testing
- The project must be on GitHub from the start.
- Commit and push regularly.
- Prefer online previews over local testing:
  - Web → Vercel preview URLs
  - Mobile → EAS Update / EAS Build (cloud)
- After important features, push and provide the preview link.
- Never assume local testing if an online preview is possible.

## GitHub handoff — required at every new mission

- At the start of every mission, read `docs/handoff/README.md`, then the assigned mission and its verification report before editing. Claude must also read `CLAUDE.md`.
- GitHub is the shared handoff source. Fetch the named branch and verify its exact commit; do not assume the default branch contains the latest handoff.
- Read `docs/stabilization/p0-status.md` for the distinction between the published baseline and unpublished local changes. Never overwrite, stash, clean, reset, or publish another contributor's unfinished changes.
- Frontend work belongs to Claude; backend and infrastructure belong to Codex. Use separate worktrees and branches. Agree shared contracts before changes.
- No task is cross-verified until the other agent has reviewed the exact revision, recorded findings and relevant checks, and verified the combined result when available.

- Current shared coordination: fetch `missions/p0-stabilization` and read its root `MISSIONS.md` and `CORRECTIONS.md` before starting. Preserve existing assignments and findings. Publish the shared verification report in CORRECTIONS.md before marking an assignment ready_for_review. Do not duplicate already claimed work.
