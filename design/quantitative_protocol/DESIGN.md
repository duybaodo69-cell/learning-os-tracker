---
name: Quantitative Protocol
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#56e5a9'
  on-tertiary: '#003824'
  tertiary-container: '#30c88f'
  on-tertiary-container: '#004e34'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  data-display:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  data-mono:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a high-density, analytical console built for high-output finance analysts, VC associates, and quantitative researchers. The interface draws inspiration from terminal-grade workstations, Bloomberg terminals, and modern engineering platforms like Linear. It deliberately eschews gamification, celebratory micro-animations, skeuomorphic badges, and patronizing streaks. Instead, it positions self-regulation, time allocation, and deal execution as calibrated empirical data.

### Design Movement & Ethos
- **Movement:** Terminal Minimalism & Scientific Precision.
- **Atmosphere:** Controlled, nocturnal, analytical, hyper-focused. The user should feel like an operator in an institutional trading room or an intelligence suite, where operational drift is immediately surfaced and corrected.
- **Tone:** Direct, empirical, unemotional, and deterministic. No celebratory graphics; success is represented by clean delta vectors and structured table feeds.

## Colors

The palette operates on a strict functional stratification where every hue corresponds to a quantitative state rather than cosmetic decoration.

### Functional Roles
- **Canvas Base (`#0c0e12`):** Primary background layer absorbing all peripheral distraction.
- **Surface Elevation 1 (`#12151c`):** Data cards, inspector panels, sidebar containers.
- **Surface Elevation 2 (`#1a1e28`):** Table rows, elevated modal dialogs, active cell regions.
- **Structural Borders (`#262c3a`):** Crisp, single-pixel hairline strokes that delineate data boundaries without visual weight.
- **Primary Accent (`#38bdf8`):** Precision Cyan. Applied exclusively to active focus rings, primary metric indicators, and system anchors.
- **Secondary Accent (`#6366f1`):** Cold Indigo. Used for structural tags, deal-stage classifications, and secondary metadata groupings.
- **Signal Tokens:**
  - Positive/Alpha (`#10b981`): Target surpassed, disciplined completion, positive financial delta.
  - Warning/Variance (`#f59e0b`): High time variance, approaching deadlines, execution risk.
  - Anomaly/Deficit (`#f43f5e`): Off-protocol distraction, lost pipeline deal, metric error.
- **Text & Contrast:**
  - High Emphasis (`#f1f5f9`): Critical metrics, active labels.
  - Medium Emphasis (`#94a3b8`): Tabular values, column descriptors.
  - Muted (`#475569`): Units, timestamps, dormant grid guides.

## Typography

The typographic hierarchy pairs the structured, mechanical geometry of `Geist` for headers, data readouts, and tabular markers with the legibility of `Be Vietnam Pro` for sustained reading, notes, and analytical memos.

### Rules of Usage
- **Input Field Constraint:** All textual and numerical inputs strictly use a minimum computed size of 16px (`body-lg`) across touch interfaces to suppress viewport layout shifts and iOS auto-zoom behavior.
- **Tabular Figures:** All numerical listings, financial units, portfolio IRRs, and hours-logged cells must enforce tabular figures (`font-variant-numeric: tabular-nums`) using `Geist` to maintain column verticality.
- **Micro Labels:** All analytical tags, table header cells, and delta chips operate at 11px to 12px with uppercase casing and expanded tracking (`+0.04em` to `+0.06em`) for rapid scannability.

## Layout & Spacing

The layout is built upon an uncompromising, dense 8-point spatial model optimized for maximum information density without cognitive clutter.

### Layout Philosophy
- **Modular Fluid Grids:** The desktop application relies on a split-pane, high-density dashboard featuring a pinned command sidebar (240px fixed), fluid multi-column analytical panels, and contextual inspect drawers (360px fixed).
- **Breakpoints:**
  - Mobile (`< 768px`): Stacked single-column card flows with persistent bottom-pinned terminal quick-entry bars. Gutter: `1rem`, Margins: `1rem`.
  - Tablet (`768px - 1023px`): 8-column layout. Gutter: `1rem`, Margins: `1.5rem`.
  - Desktop (`>= 1024px`): 12-column or 16-column continuous analytical grid. Gutter: `1.5rem`, Margins: `2rem`.
- **Rhythm & Padding:** Component internal padding uses compact steps (`space-sm` = 8px, `space-md` = 12px) to maximize viewable data points per viewport screen height.

## Elevation & Depth

Visual hierarchy rejects blurry drop shadows and synthetic lighting in favor of tectonic surface stacking and single-pixel boundaries.

### Layering Hierarchy
1. **L0 (Floor):** Canvas background `#0c0e12`. Completely matte.
2. **L1 (Panels):** Surfaces at `#12151c` defined with an outer hairline stroke of `1px solid #262c3a`.
3. **L2 (Active Modules & Inputs):** Elevated states at `#1a1e28` with borders set to `#38bdf8` at 30% alpha for interactive discovery.
4. **L3 (Command Palettes & Modals):** Foreground layers (`#1a1e28`) bordered with `1px solid #38bdf8` and an ambient, ultra-diffused drop shadow: `0 8px 32px rgba(0, 0, 0, 0.65)`. No color tints in shadow envelopes.

## Shapes

The geometric framework balances terminal hardness with modern usability. Radii are calculated at a uniform base of 4px to 8px, communicating precision and modular structural units.

### Corner Radii Guidelines
- **Micro Elements (Chips, Checkboxes, Micro-inputs):** `rounded` (4px / 0.25rem).
- **Interactive Controls (Buttons, Inputs, Select Boxes):** `rounded-lg` (8px / 0.5rem).
- **Cards, Panels, & Container Frames:** `rounded-lg` (8px / 0.5rem).
- **Circular Elements:** Strictly reserved for status pulses and delta indicators (e.g., active logging pulse indicator).

## Components

### Buttons
- **Primary Action:** Solid `#38bdf8` background, `#0c0e12` bold Geist typography, 8px border radius, 0 1px 2px rgba(0,0,0,0.5). Hover: brightness 1.08. Active: scale 0.99.
- **Secondary Action:** Transparent base, `#12151c` surface fill, `1px solid #262c3a` border, `#f1f5f9` text. Hover: border color shifts to `#38bdf8`.
- **Destructive/Discard:** `#1a1e28` background, `1px solid #f43f5e` at 40% opacity, `#f43f5e` text.

### Inputs & Numerical Fields
- **Container:** `#12151c` surface background, 8px border radius, `1px solid #262c3a`.
- **Text:** Computed `16px` font size (`Be Vietnam Pro` or `Geist`) to strictly prevent mobile viewport auto-zoom. Color: `#f1f5f9`. Placeholder: `#475569`.
- **Active / Focused:** Border transition to `1px solid #38bdf8` with an adjacent `0 0 0 1px #38bdf8` outline. Zero diffuse ambient glow.

### Table Rows & Data Grids
- **Header:** Sticky top, `#0c0e12` background, height 36px, `label-sm` typography in `#475569`, bottom border `1px solid #262c3a`.
- **Rows:** Alternating rows or pure `#0c0e12` with single bottom hairline `1px solid #1a1e28`. Height 40px for maximum screen density.
- **Cell Selection:** Solid outline `1px solid #38bdf8`, background tinted with `#38bdf8` at 6% opacity.

### Chips & Badges
- **Format:** Low-profile pill or rounded rect (`rounded`), height 20px, internal padding `2px 8px`.
- **Positive Tag:** `#10b981` at 12% fill, `1px solid #10b981` at 30%, text `#10b981`.
- **Warning Tag:** `#f59e0b` at 12% fill, `1px solid #f59e0b` at 30%, text `#f59e0b`.
- **Distraction / Anomaly Tag:** `#f43f5e` at 12% fill, `1px solid #f43f5e` at 30%, text `#f43f5e`.
- **Categorical Tag:** `#6366f1` at 12% fill, `1px solid #6366f1` at 30%, text `#6366f1`.

### Quantitative Metrics Card
- **Structure:** `#12151c` background, `1px solid #262c3a`, `rounded-lg` radius (8px), padding `space-md` (12px) to `space-lg` (16px).
- **Header:** Metric name in `label-sm` with a secondary sparkline or variance vector badge (`data-mono`).
- **Body:** Raw data in `data-display` (`Geist` 28px) with adjacent absolute difference indicator (`+14.2 bps` or `-2.4 hrs`).