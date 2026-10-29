# Design System Pro

## Direction
Use Linear, Stripe, and Apple HIG as references for precision, hierarchy, and interaction quality. Aim for a professional, dense, high-contrast interface with an intentional identity.

## Typography
- Use Geist or Satoshi, subject to licensing and project availability.
- Headings: 700–800. Body: 400–500. Establish clear contrasts in type scale.
- Do not introduce Inter, Poppins, Roboto, or system-ui as the design font.
- Preserve readable text, sensible fallback fonts, and accessibility when a preferred font fails to load.

## Color and surfaces
- Default backgrounds: #0A0A0A for dark mode and #FAFAFA for light mode.
- Use one accent color, sufficient text contrast, and restrained 1px borders.
- Semantic colors may communicate errors, warnings, or success; pair color with text or icons.
- Do not use purple/indigo gradients, decorative multi-accent palettes, or heavy drop shadows such as shadow-xl.

## Layout
- Use an 8px spacing grid with intentional whitespace.
- Prefer purposeful asymmetry where appropriate; keep forms and data views easy to scan.
- Avoid the generic centered hero followed by three interchangeable cards.
- Use responsive layouts with no horizontal overflow and usable touch targets.
- Write concrete, product-specific copy. Avoid generic SaaS claims and placeholder marketing copy.

## Interaction and review
- Include relevant loading, error, empty, disabled, and success states.
- Support keyboard navigation, visible focus, labels, and reduced motion.
- Before starting any new visual direction, ask for a visual reference (a site, a screenshot,
  a product). Never invent a direction and present it as a proposal.
- Before every UI change, read this document and inspect the existing interface.
- After implementation, identify and fix design violations and missing states. Verify responsive behavior and accessibility using available checks.
- Follow a more specific design system in a subproject when it applies; do not silently redesign an existing product.
