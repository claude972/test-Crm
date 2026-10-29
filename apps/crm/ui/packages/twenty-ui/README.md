# KovaaLab UI — local workspace

This directory supplies the `kovaa-lab-ui` workspace required by the CRM frontend, SDK and component renderer. It is private and is not an independently published npm package.

The implementation is restored from Twenty UI. The exact source revision and local adaptations are recorded in [UPSTREAM.json](./UPSTREAM.json); the original [MIT license](./LICENSE) is preserved. Component identifiers remain compatible with the upstream API.

From `apps/crm/ui`, use the bundled Yarn executable:

```sh
node .yarn/releases/yarn-4.18.1.cjs workspace kovaa-lab-ui build
```

Dependencies must first be installed for the monorepo. The upstream library documentation follows; its publishing examples do not imply that this private workspace is available on npm.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-ui/logo.png" width="136" height="136" alt="kovaa-lab-ui logo" />
</p>

# kovaa-lab-ui

Twenty's open-source React UI library provides foundational primitives, shared components, icons, and theme tokens. It ships prebuilt CSS with CSS variables, so consuming applications do not need a CSS-in-JS compiler.

Read the [kovaa-lab-ui documentation](https://docs.twenty.com/ui/getting-started) for setup, theming, and component guides.

## Installation

For an existing React application, install the library. React 19 is required.

```bash
npm install kovaa-lab-ui
```

The code editor is available separately from `kovaa-lab-ui/components/code-editor`. Applications using that entry point must install its optional peers and configure Monaco workers for their bundler before mounting the editor:

```bash
npm install @monaco-editor/react monaco-editor
```

For Twenty apps, follow [Using Twenty UI components](https://docs.twenty.com/developers/extend/apps/layout/front-components#using-kovaa-lab-ui-components). The front component renderer supplies the workspace theme. Keep `kovaa-lab-ui`, `twenty-sdk`, and `twenty-client-sdk` on the same version.

## Usage

For a standalone React application, import the base styles once, pick a theme stylesheet, and wrap your app in `ThemeProvider`:

```tsx
import { Field, Input } from 'kovaa-lab-ui/primitives/input';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import 'kovaa-lab-ui/style.css';
import 'kovaa-lab-ui/theme-light.css';

export const App = () => (
  <ThemeProvider colorScheme="light">
    <Field.Root>
      <Field.Label>Email</Field.Label>
      <Input name="email" type="email" placeholder="you@example.com" />
      <Field.Description>Use your work email address.</Field.Description>
    </Field.Root>
  </ThemeProvider>
);
```

The component stylesheet includes a global reset. Load it once at your application entry point.

Component styles and the reset use the `kovaa-lab-ui` cascade layer. Unlayered application styles override those layered rules. Put application resets in an earlier layer; see [style overrides](https://docs.twenty.com/ui/getting-started#override-styles) for the layer order and Tailwind setup.

## Entry points

Primitives provide foundational controls, including compound controls such as Select, Popover, and Dialog. Shared components compose them into presets such as `MainButton`, `LightButton`, `Dropdown`, and `Toaster`. Both layers receive data, labels, and callbacks from the application.

Prefer the matching public subpath for focused imports. The root entry point also re-exports primitives, shared components, icons, theme tokens, and utilities. Assets, testing helpers, and the optional code editor have separate entry points.

| Subpath                              | Contents                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| `kovaa-lab-ui/assets`                   | Logos and static assets                                             |
| `kovaa-lab-ui/components`               | All shared component families except the optional editor            |
| `kovaa-lab-ui/components/data-display`  | Avatar groups, command blocks, JSON trees, metrics, and icon tiles  |
| `kovaa-lab-ui/components/feedback`      | Callouts, inline banners, and notifications                         |
| `kovaa-lab-ui/components/input`         | Button presets, specialized inputs, pickers, and segmented controls |
| `kovaa-lab-ui/components/layout`        | Sections, overflowing lists, and icon transitions                   |
| `kovaa-lab-ui/components/navigation`    | Dropdowns, menu compositions, and tab actions                       |
| `kovaa-lab-ui/components/settings`      | Settings rows with labeled controls                                 |
| `kovaa-lab-ui/components/code-editor`   | Code editor, editor header, and editor theme helpers                |
| `kovaa-lab-ui/icon`                     | Icon components and the icon provider                               |
| `kovaa-lab-ui/primitives`               | All primitive families                                              |
| `kovaa-lab-ui/primitives/accessibility` | Hidden elements and keyboard interaction helpers                    |
| `kovaa-lab-ui/primitives/data-display`  | Avatars, badges, chips, tags, color samples, and status indicators  |
| `kovaa-lab-ui/primitives/feedback`      | Banners, progress indicators, loaders, and skeletons                |
| `kovaa-lab-ui/primitives/input`         | Buttons and form controls                                           |
| `kovaa-lab-ui/primitives/layout`        | Expansion, separators, direction, and resizing                      |
| `kovaa-lab-ui/primitives/navigation`    | Breadcrumbs, list items, and tabs                                   |
| `kovaa-lab-ui/primitives/surfaces`      | Cards, dialogs, popovers, and tooltips                              |
| `kovaa-lab-ui/primitives/typography`    | Text, headings, shortcuts, and overflowing text                     |
| `kovaa-lab-ui/testing`                  | Storybook and test decorators and helpers                           |
| `kovaa-lab-ui/theme`                    | Theme provider, hooks, types, and tokens                            |
| `kovaa-lab-ui/utilities`                | Hooks and shared utilities                                          |

Import icons such as `IconCheck` from `kovaa-lab-ui/icon`. The dynamic icon provider includes the full catalog, so use it when icons need to be looked up at runtime.

## Theming

- `kovaa-lab-ui/style.css` ships the base reset and component styles. Import it once.
- `kovaa-lab-ui/theme-light.css` and `kovaa-lab-ui/theme-dark.css` define the design-token CSS variables for each color scheme. Load both when your application switches between schemes.
- `ThemeProvider` applies the `light` or `dark` class to the document root by default. Set `applyToRoot={false}` to scope a theme to a subtree; `overrides` optionally customizes public `--t-` CSS variables.
- Import `themeCssVariables` for CSS variable references, `useTheme()` for theme values, and `useThemeColorScheme()` for the active scheme, all from `kovaa-lab-ui/theme`.
- The provider's `theme` prop supplies explicit JavaScript values, such as `THEME_LIGHT` or `THEME_DARK`, for consumers that cannot read computed styles. It does not replace the theme stylesheets.

See the [theming guide](https://docs.twenty.com/ui/theming) for scoped overrides, portals, and explicit values.

## Responsive hooks

Import responsive hooks and media-query constants from `kovaa-lab-ui/utilities`, `MOBILE_VIEWPORT` from `kovaa-lab-ui/theme`, and story overrides from `kovaa-lab-ui/testing`.

- `useIsMobile` matches `MOBILE_MEDIA_QUERY` (up to and including `MOBILE_VIEWPORT`). `useIsTouchDevice` matches `TOUCH_DEVICE_MEDIA_QUERY` and is independent of width: branch interaction behavior on it, and layout on `useIsMobile`.
- `useMediaQuery(query)` subscribes to native `matchMedia` changes and shares one `MediaQueryList` per query. It returns `false` during server rendering and the first hydration render, and wherever `window.matchMedia` is unavailable. In a front component, `matchMedia` answers for the widget's own box, so `useIsMobile` follows the widget width rather than the browser viewport, while `useIsTouchDevice` follows the primary input of the user's device.
- To force a result in a story, return `overrideMediaQueryMatches({ [MOBILE_MEDIA_QUERY]: true })` from `beforeEach`; the returned cleanup restores the native `matchMedia`.

## Development

Use the Node.js version in the repository's `.nvmrc` and the Yarn version in its root `package.json`. Run the following commands from the repository root:

```bash
yarn install
npx nx generateBarrels kovaa-lab-ui
npx nx storybook:serve:dev kovaa-lab-ui
```

Storybook runs at `http://localhost:6008`.

| Command                                                 | Purpose                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| `npx nx build kovaa-lab-ui`                                | Build ESM, CommonJS, CSS, and TypeScript types |
| `npx nx lint kovaa-lab-ui`                                 | Check lint and formatting                      |
| `npx tsgo -p packages/twenty-ui/tsconfig.json --noEmit` | Check types directly, without the Nx cache     |
| `npx nx test kovaa-lab-ui`                                 | Check module ownership and run unit tests      |
| `npx nx storybook:build kovaa-lab-ui`                      | Build Storybook                                |
| `npx nx storybook:test kovaa-lab-ui`                       | Run browser stories with coverage              |
| `npx nx test:package kovaa-lab-ui`                         | Check optional dependencies and theme exports  |

Before running browser stories, install Chromium with `npx playwright install chromium` from `packages/twenty-ui`.

### Source layout and generated files

Primitives live in `src/primitives/<family>`, shared components in `src/components/<family>`, and the optional editor in `src/components/code-editor`. Keep each component's types, stories, tests, and private parts beside its implementation. Components use SCSS modules and theme CSS variables.

Record formatting, routing, product illustrations, and feature-specific animation belong to the host application. Implementation parts in `internal` or `parts` directories are excluded from public barrels.

- Run `npx nx generateBarrels kovaa-lab-ui` after changing public exports. Do not edit generated barrels by hand.
- Edit token sources in `design-tokens`, then run `npx nx generateTokens kovaa-lab-ui`. Use `npx nx generate:check kovaa-lab-ui` to check that generated token files are current.
- Run `npx nx check:ownership kovaa-lab-ui` to validate exports, generated files, and dependency rules. After an intentional interface change, run `node --import tsx packages/twenty-ui/scripts/checkModuleOwnership.ts --write` and review the two inventory files in `docs/`.

### Documentation

Primitive guides belong in `packages/twenty-docs/ui/primitives`. Shared component guides belong in `packages/twenty-docs/ui/components`.

Every component guide starts with its purpose and a `Display` story, followed by **Usage** with complete code matching that preview. Use realistic content and the public API. Compound components share one complete display across their parts; providers and accessibility helpers demonstrate their effect in context. Keep useful Storybook controls available on the display.

Make previews look like usable UI. Align controls with their labels, separate actions from supporting text, and give panels and cards enough padding. Constrain long text to a readable width, use theme colors for secondary content, and check that examples fit the documentation frame in both light and dark themes. Keep these layout choices in the example and its matching code snippet.

Preserve the component's existing appearance in its Display story. Improve the surrounding layout without changing the control's shape, size, variant, or focus styling for decoration. Show alternative appearances in named stories or catalogs.

Use these story roles consistently:

| Story               | Purpose                               | When to include it                                |
| ------------------- | ------------------------------------- | ------------------------------------------------- |
| `Display`           | One representative, usable example    | Every component guide                             |
| `Catalog`           | Labeled comparisons of visual options | When seeing options together helps readers choose |
| Named examples      | A specific behavior or composition    | When the component supports distinct workflows    |
| Interaction stories | Verify behavior with `play` functions | Keep these separate from embedded previews        |

After Usage, document visual options, anatomy where relevant, behavior and composition, accessibility, and the generated API reference. Omit sections that add no useful information. Put migration guidance before the API reference.

Catalogs should group variants, sizes, colors, and states separately. Use a matrix only when two dimensions need to be compared together. Avoid multiplying every prop combination. Use `GroupedCatalog` from `kovaa-lab-ui/testing` for a consistent grouped layout. Simple components can use a focused alternative example; interactive components usually need working workflow examples. Use the preview's light and dark tabs for theme comparison.

Keep comprehensive visual checks in separate `VisualRegression` stories using `CatalogDecorator`, including the existing dark-theme and variant matrices. Tag them with `!autodocs` and do not embed them in the guides. Simplifying a documentation catalog must preserve its existing visual regression coverage.

Embed stories with a descriptive `title` and a height that closely fits their content, including the preview's padding. Check wrapping at narrow documentation widths. Reserve additional height only for dropdowns, popups, validation messages, resizing, or other expanding content, and verify those states fit. Embedded stories can respond to the reader, but must not define or inherit a `play` function. Share a presentational example with its interaction story instead of copying automated interactions into the documentation.

For each stateful API that supports both modes, include separate **Uncontrolled state** and **Controlled state** examples with the same scenario, labels, and initial state. Keep each example complete, with public imports and one exported example component.

Explain state ownership before advanced behavior such as indeterminate selection or manual tab activation. Document independent states, such as selection and popup visibility, separately. For components that delegate state to a parent or group, explain that ownership and link to the relevant examples.

For compound components, include an anatomy tree and identify required parts, optional parts, and elements supplied internally. Show supported composition with complete examples, use Twenty UI components for supporting controls, and explain how custom wrappers preserve props and refs. Use `text` fences for structural diagrams and `tsx` fences for runnable examples so the documentation checker validates the examples.

Run `npx nx generate:ui twenty-docs` after changing documented component props or theme tokens, then review the generated data in `packages/twenty-ui/generated` and snippets in `packages/twenty-docs/snippets/ui/generated`. Run `npx nx check:ui twenty-docs` to validate generated references and documentation examples. Run `npx nx check:ui-stories twenty-docs` to validate preview titles, story references, the required first `Display`, and the absence of automated interactions in embedded stories.

### Testing

Component interaction and behavior tests belong in Storybook stories (`*.stories.tsx`) using `play` functions. Component unit tests are reserved for conformance (native props, refs, class names, rendering, and prop types). Keep non-interactive utility, hook, and token tests in the Vitest unit project; avoid duplicating story coverage there.

```bash
npx vitest run --root packages/twenty-ui --project unit <file>
npx vitest run --root packages/twenty-ui --project storybook <file>
```

The unit project runs in jsdom. The Storybook project runs in headless Chromium through Playwright, including story interactions and accessibility checks. `npx nx storybook:test kovaa-lab-ui` also runs the `reduced-motion` browser project for reduced-motion checks.

## License

kovaa-lab-ui is released under the [MIT](https://github.com/twentyhq/twenty/blob/main/packages/twenty-ui/LICENSE) license.
