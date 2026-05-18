# Lambda.ai — Pixel-Perfect Reconstruction

A faithful reconstruction of three sections from [lambda.ai](https://lambda.ai) built as a standalone React application. The goal was exact visual and behavioral parity: colors, typography, spacing, transitions, and interactions sourced directly from the live site — nothing invented.

## Stack

- **Vite + React**
- **Tailwind CSS** — layout utilities only
- **Custom CSS** — all design tokens applied via CSS custom properties

## Sections

### Hero

Full-viewport section with a large animated heading. Individual letters cycle between the primary sans-serif and a pixel font (`apkarchivr21`) on a timed loop, paired with an RGB chromatic aberration text-shadow effect. The primary CTA button carries the same RGB box-shadow. A canvas element renders the background.

### Features / Vertical Accordion

A two-column grid (7/12 accordion + 5/12 illustration) at desktop widths. Four accordion items — item 01 is locked open by default. Open panels expand via `max-height` and `visibility` transitions (0.6s linear). The number column renders a `"01/"` label where the slash is the accent color (`#6236F4`) via a CSS `::after` pseudo-element. The right column holds a static isometric datacenter SVG illustration.

### Hardware / Horizontal Accordion

Four product cards in a horizontal flex layout, each 610px tall. The active card expands to `flex-basis: 46%` with a `0.4s cubic-bezier(0.6, 0, 0.4, 1)` transition. Inactive card images use `mix-blend-mode: luminosity`; the active card restores to normal blending. Description text fades in with a `translateY` offset and a 0.5s delay after activation. On mobile, cards stack vertically and descriptions are always visible.

## Design System Fidelity

Fonts are loaded from the HubSpot CDN via `@font-face` declarations in `index.css`:
- `Suisse Intl` — headings and accordion titles
- `Suisse Intl Mono` — body text, buttons, and numbers
- `apkarchivr21` — hero font-swap animation only

All CSS custom properties (colors, spacing, shadows, transitions, typography scale) were extracted directly from the live site's stylesheet and applied as-is. No values were hardcoded or approximated — every token is consumed via `var(--)` references throughout the components.

## Running Locally

```bash
npm install
npm run dev
```

## Methodology

The live site's CSS was extracted and used as the source of truth for every value. The DOM structure was studied via DevTools to understand layout, state classes, and transition mechanics. All design tokens were preserved as custom properties and applied consistently across components to maintain exact fidelity with the original.
