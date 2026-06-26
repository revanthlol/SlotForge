---
name: Industrial Academic
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dae0'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#404945'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#707975'
  outline-variant: '#c0c8c4'
  surface-tint: '#376759'
  primary: '#124538'
  on-primary: '#ffffff'
  primary-container: '#2d5d4f'
  on-primary-container: '#a1d4c2'
  inverse-primary: '#9fd1bf'
  secondary: '#9c440f'
  on-secondary: '#ffffff'
  secondary-container: '#fd8e55'
  on-secondary-container: '#6e2a00'
  tertiary: '#5e312a'
  on-tertiary: '#ffffff'
  tertiary-container: '#794740'
  on-tertiary-container: '#fcb9af'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#baeddb'
  primary-fixed-dim: '#9fd1bf'
  on-primary-fixed: '#002018'
  on-primary-fixed-variant: '#1e4f41'
  secondary-fixed: '#ffdbcc'
  secondary-fixed-dim: '#ffb693'
  on-secondary-fixed: '#351000'
  on-secondary-fixed-variant: '#7a3000'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#f9b6ac'
  on-tertiary-fixed: '#34100b'
  on-tertiary-fixed-variant: '#693a33'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
  paper: '#f7f5f0'
  paper-raised: '#ffffff'
  grid-line: rgba(27, 31, 35, 0.08)
  rule: rgba(27, 31, 35, 0.14)
  accent-soft: rgba(45, 93, 79, 0.12)
  signal-soft: rgba(196, 98, 45, 0.12)
  mono-grey: '#6b6f73'
typography:
  display-lg:
    fontFamily: Fraunces
    fontSize: 64px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Fraunces
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Fraunces
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Fraunces
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16.5px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.12em
  data-table:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.2'
  code-snippet:
    fontFamily: JetBrains Mono
    fontSize: 12.5px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  grid-unit: 64px
  gutter: 16px
  margin-page: 32px
  stack-lg: 64px
  stack-md: 32px
  stack-sm: 16px
  inset-deep: 32px 36px
  inset-standard: 24px 26px
  inset-compact: 16px 18px
---

## Brand & Style

This design system embodies the "Industrial Academic" aesthetic—a synthesis of institutional authority and high-precision engineering. It is designed for "the expert," prioritizing clarity, information density, and structural integrity over decorative flair. The system evokes the feeling of a technical whitepaper or an architectural blueprint: rigorous, dependable, and intellectually sophisticated.

The visual language is defined by:
- **Intentional Whitespace:** Large margins and a 64px macro-grid create a sense of focus and breathing room for complex data.
- **Structural Rules:** Heavy ink-colored borders and hairline dividers replace shadows to define hierarchy and containment.
- **Data-Driven Texture:** Subtly visible grid lines and monospaced metadata reinforce the product's identity as a technical engine.
- **High Fidelity:** Crisp edges and a "paper-and-ink" color palette provide a tactile, grounded experience.

## Colors

The palette is rooted in a "Paper and Ink" metaphor, optimized for long-form reading and data analysis.

- **Primary (Deep Pine):** Used for "The Solver," signifying precision, success, and primary actions. It represents the "solved" state.
- **Secondary (Burnt Orange):** A functional signal color used for conflicts, highlights, and directional flow. It captures attention without being alarmist.
- **Neutral (Ink):** The foundation for all structural elements, borders, and primary typography.
- **Surfaces:** The system uses a two-tier background strategy. `Paper` is the global canvas, while `Paper-Raised` is used for interactive containers, cards, and data-entry zones to provide subtle contrast.

## Typography

Typography is used to delineate functional zones. 

- **Editorial Layer (Fraunces):** High-contrast serif for headings. Use italics sparingly for emphasis on "Constraint-Driven" or "Solved" terminology.
- **Interface Layer (IBM Plex Sans):** A neutral sans-serif for body descriptions and instructional text, ensuring readability across high-density layouts.
- **Technical Layer (JetBrains Mono):** Used for all technical metadata, labels, code, and table data. The monospaced nature reinforces the "engine" aspect of the product.

Standardize letter spacing for all labels to `0.12em` to ensure they feel like distinct "markers" rather than running text.

## Layout & Spacing

The layout is built on a **64px visual grid**, which should be subtly rendered as a background texture using the `grid-line` color. 

- **Philosophy:** A fixed-width central column (`980px`) is preferred for documentation and engine configurations, ensuring line lengths remain optimal for reading.
- **Rhythm:** Vertical spacing follows a rigorous stack. Major sections are separated by `64px`, while internal component elements use `16px` or `32px` increments.
- **Density:** The system supports high-density views. Use `inset-compact` for technical tables and `inset-deep` for conceptual blocks or primary solver inputs.
- **Breakpoints:** On screens smaller than `640px`, margins reduce to `16px` and the layout reflows to a single-column vertical stack.

## Elevation & Depth

This system avoids ambient shadows in favor of **Tonal Layering** and **Structural Borders**.

- **Depth Tiers:** 
    - **Base:** The `paper` background is the lowest level.
    - **Surface:** The `paper-raised` white containers represent the primary interactive layer.
    - **Overlay:** Heavy `ink` borders (2px) are used to "ground" the header and footer, creating a document-like frame.
- **Dividers:** Use `1px solid var(--rule)` for standard containment. Use `1px dashed var(--rule)` for internal logical associations within a card (e.g., separating keywords or technical tags).
- **Interactive States:** Instead of raising an element on hover, use a background color shift to `accent-soft` or a subtle increase in border weight to `1.5px`.

## Shapes

The shape language is "Softened Industrial." Edges are primarily sharp to maintain a professional, data-driven feel, with very slight rounding to prevent the UI from feeling aggressive.

- **Standard Containers:** Use a `2px` radius for a crisp, engineered appearance.
- **Pills & Buttons:** Use a `3px` radius for a subtle "soft-touch" effect.
- **Status Markers:** Use a `1px` radius—appearing almost square—to represent binary states or precise data points.

## Components

### Buttons & Actions
- **Primary Action:** Solid `Deep Pine` background with `Paper-Raised` text. 3px radius.
- **Secondary Action:** `1px solid Ink` border, no background, `Ink` text.
- **Ghost Action:** No border, `Ink` text, `accent-soft` background on hover only.

### Data Density (Tables)
- **Compact Tables:** Header rows use `Ink` background with `Paper-Raised` JetBrains Mono text. Row borders are `1px solid var(--rule)`.
- **Status Badges:** Small pills with `1px` radius. 
    - *Success:* `Deep Pine` text on `accent-soft` background.
    - *Conflict:* `Burnt Orange` text on `signal-soft` background.

### Scheduling & Grid
- **Time-Slot Grids:** Use `1px solid var(--rule)` for the grid. Active slots use `Paper-Raised`. Conflict slots use a `Burnt Orange` left-border (4px) and `signal-soft` background.
- **Conflict Markers:** A simple `1px` stroke box in `Burnt Orange` with an interior `JetBrains Mono` error code.

### Job Status
- **Progress Indicators:** Linear horizontal bars. The track is `rule` color; the fill is `Deep Pine`. For asynchronous processes, use a `1px dashed` animation on the track.

### Versioning
- **Draft State:** Background uses `Paper`, borders are `1px dashed`.
- **Published State:** Background uses `Paper-Raised`, borders are `1px solid`. A "Published" label in `label-caps` must accompany the container.

### Inputs
- **Fields:** `Paper-Raised` background, `1px solid Ink` bottom border only in default state, transitioning to full `1px solid Deep Pine` on focus.