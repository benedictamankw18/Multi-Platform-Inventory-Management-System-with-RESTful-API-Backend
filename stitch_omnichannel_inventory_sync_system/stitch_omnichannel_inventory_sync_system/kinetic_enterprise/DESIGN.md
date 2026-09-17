---
name: Kinetic Enterprise
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#45464d'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for high-density, mission-critical inventory management. It utilizes an **Enterprise Modern** aesthetic—a synthesis of high-functionality Minimalism and Corporate reliability. The primary objective is to reduce cognitive load while managing vast datasets.

The UI evokes a sense of **precision, stability, and speed**. It avoids decorative flourishes in favor of structural clarity, utilizing whitespace to separate data clusters rather than just for aesthetics. The interface feels like a high-performance tool: utilitarian, durable, and highly responsive to professional workflows.

## Colors

The palette is anchored by **Professional Blue** for structural elements like sidebars and global headers, providing a "grounded" frame for the application. **Vibrant Indigo** is reserved strictly for primary intent actions, ensuring the "Next Best Action" is always visually obvious.

Semantic colors follow standard industry conventions but are optimized for accessibility. Backgrounds use a subtle off-white to reduce screen glare during long shifts, while pure white surfaces indicate interactive or editable containers. Text uses a tiered Slate palette to ensure a clear distinction between data labels (lighter) and data values (darker).

## Typography

This design system utilizes **Inter** for its exceptional legibility at small sizes and its neutral, systematic tone. A secondary monospaced font, **JetBrains Mono**, is introduced specifically for SKU numbers, tracking IDs, and quantities to ensure character distinction (e.g., distinguishing '0' from 'O').

**Hierarchy Rules:**
- **Data Points:** Should use `body-sm` or `data-mono` for maximum density in tables.
- **Labels:** Use `label-caps` in a medium-gray tint to act as secondary metadata.
- **Headings:** Use `display-lg` only for top-level dashboard summaries; keep internal card titles to `title-sm` to preserve vertical space.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a fixed-width sidebar (240px). It uses a base-4 unit system to ensure mathematical harmony across all components.

- **Desktop (1440px+):** 12-column grid, 24px margins, 16px gutters.
- **Tablet (768px - 1024px):** 8-column grid, 16px margins, 12px gutters. Sidebar collapses to an icon-only rail.
- **Mobile (<768px):** 4-column grid, 16px margins. Tables must transition to a "card-list" format for readability.

Vertical spacing should be "compact" within data tables (row height 40px-48px) and "comfortable" within settings or form pages (row height 56px-64px).

## Elevation & Depth

This design system uses a **Tonal Layering** approach combined with **Low-Contrast Outlines**. Deep shadows are avoided to prevent the UI from feeling "heavy" or cluttered.

- **Level 0 (Background):** `#F8FAFC` - The canvas.
- **Level 1 (Cards/Tables):** White surface with a 1px border of `#E2E8F0`. No shadow.
- **Level 2 (Dropdowns/Modals):** White surface with a 1px border and a soft, diffused shadow (`0px 10px 15px -3px rgba(0,0,0,0.1)`).
- **Interactive State:** On hover, table rows should apply a subtle background tint of `#F1F5F9` rather than an elevation change.

## Shapes

The shape language is **Soft (0.25rem / 4px)**. This slight rounding provides a modern touch without sacrificing the professional, "engineered" feel of the system. 

- **Inputs & Small Buttons:** 4px radius.
- **Cards & Modals:** 8px radius (`rounded-lg`).
- **Status Badges:** 4px radius (never pill-shaped) to maintain a structured, grid-aligned look.
- **Search Bars:** May use 4px to match inputs or a 24px pill-shape if used as a standalone global element.

## Components

### Buttons
- **Primary:** Solid `#4F46E5` with white text. High emphasis.
- **Secondary:** Outline with `#E2E8F0` border and `#1E293B` text. For neutral actions.
- **Ghost:** No border or background. Used for utility actions in tables (e.g., "Edit", "Details").

### Data Tables
- **Header:** Sticky top with `#F8FAFC` background and `label-caps` text.
- **Cells:** `body-sm` text. Numeric data should be right-aligned for easy comparison.
- **Borders:** Horizontal-only borders (`#F1F5F9`) to emphasize the flow of data across the row.

### Status Badges
- Used for inventory levels.
- **Success:** `#DCFCE7` background with `#166534` text.
- **Warning:** `#FEF3C7` background with `#92400E` text.
- **Danger:** `#FEE2E2` background with `#991B1B` text.

### Stat Cards
- Summary widgets featuring a `title-sm` label, a `display-lg` value, and a small trend sparkline (using semantic colors to show 24h change).

### Input Fields
- Standard state: `#F1F5F9` background, `#CBD5E1` border.
- Focus state: White background, 2px `#4F46E5` border with a soft glow ring.
- Label: Positioned above the input using `body-sm` with 600 weight.