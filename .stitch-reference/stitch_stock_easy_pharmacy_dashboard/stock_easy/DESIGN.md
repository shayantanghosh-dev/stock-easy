---
name: Stock Easy
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#1d59c1'
  primary: '#003c90'
  on-primary: '#ffffff'
  primary-container: '#0f52ba'
  on-primary-container: '#bcceff'
  inverse-primary: '#b0c6ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#3d4143'
  on-tertiary: '#ffffff'
  tertiary-container: '#55585a'
  on-tertiary-container: '#ccced0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#00419c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
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
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin: 32px
  container-max: 1440px
---

## Brand & Style

The design system focuses on the intersection of healthcare reliability and high-performance software. The brand personality is **reliable, efficient, and sophisticated**, designed to instill confidence in pharmacists and inventory managers handling critical supplies.

The visual style is **Corporate / Modern**, heavily influenced by the precision of developer-centric tools like Linear and the refined clarity of Stripe. It prioritizes high legibility and reduced cognitive load through a clinical, sterile aesthetic that feels premium rather than utilitarian. The interface utilizes high-quality typography, intentional whitespace, and subtle micro-interactions to create a calm, focused environment for data-heavy inventory tasks.

## Colors

The palette is anchored by **Pharmacy Blue** (#0F52BA), a deep, authoritative navy-blue that signifies trust and medical professionalism. This is supported by **Medical Green** (#10B981), reserved strictly for positive status indicators, successful stock updates, and "Add to Inventory" actions.

The foundation is built on **Clean White** (#FFFFFF) and a suite of "Cool Grays" derived from the neutral palette. Surfaces use subtle shifts in off-white (#F8FAFC) to create hierarchical separation without the need for heavy borders. Semantic colors for warnings (Amber) and errors (Rose) follow the same desaturated, professional tone to maintain the "clinical" feel.

## Typography

This design system uses a triple-font strategy to handle complex information:
- **Geist** is used for headlines and display text, providing a sharp, technical edge that feels modern and precise.
- **Inter** handles all body copy and UI labels, chosen for its exceptional legibility and neutral character in dense interfaces.
- **JetBrains Mono** is utilized specifically for SKU numbers, lot IDs, and stock counts to ensure character distinction (e.g., distinguishing '0' from 'O') and provide a technical, "scannable" quality to data tables.

Line heights are generous to prevent text-heavy pharmacy pages from feeling cramped. For mobile, headline sizes are aggressively scaled down to ensure that inventory names remain visible without excessive wrapping.

## Layout & Spacing

The layout utilizes a **Fixed Grid** model on desktop to maintain a premium, editorial feel for the dashboard, while transitioning to a **Fluid Grid** on tablet and mobile. 

- **Desktop (1440px+):** 12-column grid with a 1200px max-width container, 24px gutters, and 32px side margins.
- **Tablet (768px - 1024px):** 8-column fluid grid with 16px gutters and 24px margins.
- **Mobile (Under 768px):** 4-column fluid grid with 12px gutters and 16px margins.

The spacing rhythm is strictly based on a **4px baseline**. Large whitespace "breathing zones" (40px+) are used between major sections to reduce the anxiety often associated with medical software.

## Elevation & Depth

To maintain a "clinical" and "sterile" aesthetic, this design system avoids heavy shadows. Instead, it uses **Low-contrast outlines** and **Tonal layering**:

- **Level 0 (Base):** Clean White (#FFFFFF).
- **Level 1 (Sub-navigation/Sidebar):** Cool Gray (#F8FAFC) with a 1px solid border (#E2E8F0).
- **Level 2 (Cards/Modals):** White background with a subtle, highly-diffused ambient shadow (Offset: 0, 4px; Blur: 12px; Color: rgba(15, 82, 186, 0.05)) and a soft 1px border.
- **Interactive States:** Elements slightly "lift" using a secondary subtle shadow (Offset: 0, 8px; Blur: 20px) to indicate clickability.

Depth is used to guide the eye toward the most important data—typically the inventory status and urgent stock alerts.

## Shapes

The shape language is **Rounded**, striking a balance between the friendliness of modern SaaS and the precision of medical equipment. 

Standard components (buttons, input fields, cards) use a **0.5rem (8px)** corner radius. Larger containers like modals use **1rem (16px)** to feel softer and more approachable. Status chips and badges utilize a **Pill-shaped** radius to distinguish them clearly from interactive buttons.

## Components

### Buttons
- **Primary:** Pharmacy Blue background, white text. No gradient. 8px radius.
- **Success:** Medical Green background. Used exclusively for "Confirm Order" or "Stock In."
- **Secondary/Ghost:** Thin 1px border (#E2E8F0) with transparent background.

### Input Fields
- High-contrast 1px border. On focus, the border changes to Pharmacy Blue with a 3px soft blue glow (ring).
- Labels are always positioned above the input in `label-sm` (Inter SemiBold).

### Data Tables (Critical Component)
- **Rows:** 56px height for readability.
- **Headers:** Light gray background (#F8FAFC) with `label-sm` uppercase text.
- **Monospace Integration:** All numeric values (quantities, prices) must use `data-mono` (JetBrains Mono).

### Status Badges
- Used for "In Stock," "Low Stock," and "Expired." 
- Features a small dot icon alongside the text for accessibility. 
- Colors are highly desaturated (e.g., Low Stock is a very pale amber background with dark amber text).

### Cards
- Pure white background with a light border. No heavy shadows.
- Used for grouping related inventory metrics (e.g., "Total Valuation," "Items to Reorder").