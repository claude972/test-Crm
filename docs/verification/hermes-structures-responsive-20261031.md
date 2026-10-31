# Structures — responsive table correction

Owner: Codex intake_backend, exclusive scope accepted and coordination published as0b8df6d5c before edits. Branch `fix/hermes-structures-responsive-20261031`, isolated sparse worktree `/private/tmp/hermes-structures-responsive`, base `4825f4668`. Original checkout, Claude trees, queries and permissions untouched.

## Observed defect and change

Root observed `/settings/structures` at390×844 with navigation closed: French column headers overlapped and the company name was reduced to `Re…`. Evidence inspected locally: `/private/tmp/hermes-final-preview-508d36d60/recipe/mobile-structures-content-390.png`.

The existing grid allowed every column to shrink to zero. The existing table is now inside a bounded horizontal scroll region, with minimum table width240+120×metricColumnCount (720px for the four standard metric columns). On narrow screens the table can be scrolled inside the settings content; the page itself is not intentionally widened. When content space is sufficient, the existing width100% table and grid proportions remain in use. Column order, rows, totals, tags, company-name tooltip and all missing/forbidden/partial states are unchanged.

The region uses the existing translated “Across your companies” label, is keyboard focusable and has a visible focus outline. No new translation catalog entries, dependencies, queries, effect, state, role checks or switching behavior were added. This is a layout correction, not a redesign.

## Verification actually performed

- Read workspace and repository AGENTS/DESIGN, subproject instructions and shared vercel-react-best-practices skill; inspected the provided screenshot and native Table/TableRow/TableHeader/TableCell/SettingsPageContainer patterns.
- TypeScript AST parse and transpile of the changed TSX: PASS (syntax/emit only, not a global typecheck).
- AST comparison of all component statements before the JSX return against the exact base: PASS, proving query options and data/metric/grid derivation unchanged.
- Prettier check on the single source file: PASS. git diff --check: PASS. Diff manually reviewed; JSX changes are wrapper, inline minWidth and indentation.
- No new unit test mirroring CSS was added. No local app, browser runtime, preview, service, database or large build launched. No pixel/layout success claimed from TSX parsing.

## Required integrated follow-up

Root must integrate/review the exact pushed SHA, run native frontend checks, then repeat the actual browser recipe at390×844: labels do not overlap, name/metrics are readable through in-content horizontal scroll, tab focus and keyboard scroll work, document does not horizontally overflow; compare desktop layout. Existing long company names retain their native tooltip/truncation behavior. Provider/integration readiness is outside this correction.
