# Lambda.ai Homepage Reconstruction

## Project Goal

Pixel-perfect React + Tailwind reconstruction of 3 sections from lambda.ai:

1. Hero Section
2. Features / Accordion Section
3. Hardware / Horizontal Accordion Section

## Source files

- `src/assets/source_html.html` — extracted DOM structure (source of truth for markup)
- `src/assets/styles_css.css` — extracted CSS (source of truth for ALL values — never guess)
- `src/assets/guidelines.json` — design system overview

original website screenshots
- `src/assets/features-screenshot.png` 
- `src/assets/hardware-screenshot.png` 
- `src/assets/hero-screenshot.png 

## Stack

- Vite + React
- Tailwind CSS (for layout utilities only when convenient)
- Custom CSS variables from the design system (already loaded in index.css)

## Design System — Critical Values

### Fonts (already declared via @font-face in index.css)

- `--font-sans`: "Suisse Intl" — headings, accordion titles
- `--font-mono`: "Suisse Intl Mono" — body, buttons, numbers
- `--font-pixel`: "apkarchivr21" — hero font-swap animation only

### Key Colors

- Background: `#0B0B0B` (hero/features), `#000000` (hardware)
- Text primary: `#E7E6D9` (--color-shell)
- Text secondary: `#B0AFA6` (--color-neutral-300)
- Accent: `#6236F4` (--color-ultraviolet)
- Divider: `#262625` (--color-neutral-800)

### Key Shadows

- `--box-shadow-rgb`: `0 .99px 0 0 #ff0, .99px 0 0 0 #0ff, 1.98px .99px 0 0 #0f0, 0 -.99px 0 0 #00f, -.99px 0 0 0 #f0f, -1.98px 0 0 0 #f00`
- `--text-shadow-rgb`: same pattern with text-shadow syntax

### Transitions

- `--transition-snappy`: `0.1s cubic-bezier(0.6, 0, 0.4, 1)`
- `--transition-smooth`: `0.4s cubic-bezier(0.6, 0, 0.4, 1)`

## Section-specific notes

### Hero

- min-height: calc(100dvh - 100px)
- Font sizes: 2.6rem → 3rem (480px) → 4.5rem (768px) → 6rem (1024px) → 7.315rem (1280px)
- Font swap animation: letters in h1 alternate between --font-sans and --font-pixel with text-shadow-rgb, on a timed loop
- Buttons: gap 18px, margin-top 50px, centered. Primary has box-shadow-rgb, secondary (#6236F4) has none.

### Features Accordion

- Grid: 7/12 left (accordion) + 5/12 right (illustration) at 1024px+
- Item 01 locked open by default — clicking it does nothing
- Transition: max-height .6s linear, padding .6s linear, visibility .6s linear
- Closed: max-height: 0, visibility: hidden, padding-top: 0
- Open: max-height: 400px, visibility: visible, padding-top: 20px
- Number column shows "01/" — the "/" is ultraviolet (#6236F4), added via CSS ::after
- Right column: static SVG isometric datacenter illustration (no animation needed)
- Layers: "Purpose-built datacenters", "AI infrastructure", "Managed services", "Co-engineering"
- Right labels: "AI DEVELOPERS", "ENTERPRISE", "SUPERINTELLIGENCE"

### Hardware Horizontal Accordion

- Background: #000000 (pure black, darker than hero)
- Card height: 610px fixed
- Active card: flex-basis 46%, transition 0.4s cubic-bezier(0.6, 0, 0.4, 1)
- Image: mix-blend-mode luminosity on inactive, normal on active
- Description text: opacity 0 + translateY(-20px) → opacity 1 + translateY(0), delay 0.5s
- Indicator bar: #E7E6D9 default, #6236F4 on active/hover
- Mobile: stack vertically, description always visible

## Products (Hardware section)

1. NVIDIA VR200 NVL72 — "Rack-scale systems optimized for agentic AI."
2. NVIDIA GB300 NVL72 — "Rack-scale systems optimized for AI reasoning"
3. NVIDIA HGX B300 — "Peak performance per watt for the largest training runs"
4. NVIDIA HGX B200 — "Versatile fine-tuning and inference"

## Images

Fetch directly from lambda.ai:

- https://lambda.ai/hubfs/VR200.jpg
- https://lambda.ai/hubfs/gb300.png
- https://lambda.ai/hubfs/NVIDIA%20HGX%20B300%20(1).png
- https://lambda.ai/hubfs/b200.png

## Code rules

- Never invent CSS values — always reference styles_css.css
- Use CSS custom properties (var(--...)) everywhere, not hardcoded values
- Components go in src/components/
- Keep each section as its own component: HeroSection, FeaturesSection, HardwareSection
