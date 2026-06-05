# Stock Easy — Design System ("Slate Pro")

> The canonical reference for Stock Easy's web UI. This documents the **implemented**
> system (tokens in `tailwind.config.ts`, base layer in `src/app/globals.css`, and the
> component library in `src/components/`). It supersedes the early Stitch mockup spec in
> `.stitch-reference/`, which captured an earlier exploration and no longer matches the
> shipping palette.
>
> **Golden rule:** style with **semantic token names**, never raw hex or ad-hoc Tailwind
> colors. Token names are stable; their values can be re-skinned in one file
> (`tailwind.config.ts`) without touching component markup.

---

## 1. Principles

Stock Easy sits at the intersection of **healthcare reliability** and **high-performance
software**. The product personality is *reliable, efficient, sophisticated* — built to
earn the trust of pharmacists handling critical, time-sensitive (FEFO) inventory.

- **Clinical, not utilitarian.** Calm surfaces, intentional whitespace, low-contrast
  outlines instead of heavy shadows. Premium feel in the spirit of Linear / Stripe / Mercury.
- **Reduce cognitive load.** Strong typographic hierarchy, generous line-height, and
  monospaced numerals so data is scannable.
- **One product, not many pages.** Every screen is assembled from the shared primitives
  below. New screens compose existing components rather than inventing markup.
- **State is a first-class citizen.** Loading, empty, error, and permission states are
  designed, never an afterthought — and most are built into the shared components.

---

## 2. Design tokens

### 2.1 Color

The palette is a slate-neutral foundation + a deep, authoritative blue brand + an emerald
"positive/success" accent, with desaturated semantic states. All values live under
`theme.extend.colors` in `tailwind.config.ts`.

**Surfaces (tonal layering — depth without heavy shadow)**

| Token | Hex | Use |
| --- | --- | --- |
| `background` / `surface` | `#f8fafc` | App canvas |
| `surface-bright` | `#ffffff` | Brightest surface |
| `surface-container-lowest` | `#ffffff` | **Cards, tables, inputs, popovers** |
| `surface-container-low` | `#f1f5f9` | Hover fills, subtle insets |
| `surface-container` | `#f1f5f9` | Grouped containers |
| `surface-container-high` | `#e7ecf2` | Neutral chips, skeletons, hover |
| `surface-container-highest` | `#dbe2ea` | Strongest neutral fill |
| `surface-variant` | `#e2e8f0` | Muted fills |

**Ink (text)**

| Token | Hex | Use |
| --- | --- | --- |
| `on-surface` | `#0f172a` | Primary text, headings |
| `on-surface-variant` | `#475569` | Secondary text, labels, captions |

**Outline (borders)**

| Token | Hex | Use |
| --- | --- | --- |
| `outline` | `#94a3b8` | Stronger borders, hover edges |
| `outline-variant` | `#e2e8f0` | **Default hairline border** (cards, inputs, dividers) |

**Brand colors (semantic roles)**

| Role | Token(s) | Hex | Use |
| --- | --- | --- | --- |
| Primary (refined blue) | `primary` / `on-primary` | `#1d4ed8` / `#fff` | Primary actions, links, focus ring, active nav |
| Primary container | `primary-container` / `on-primary-container` | `#1e3a8a` / `#dbeafe` | Tinted primary surfaces |
| Secondary (emerald) | `secondary` / `on-secondary` | `#059669` / `#fff` | **Success only:** "Stock in", positive deltas, completed |
| Secondary container | `secondary-container` / `on-secondary-container` | `#d1fae5` / `#065f46` | Success badges/chips |
| Tertiary (slate) | `tertiary` | `#475569` | Muted/review/neutral emphasis |
| Error (red) | `error` / `error-container` / `on-error-container` | `#dc2626` / `#fee2e2` / `#991b1b` | Danger, destructive, expired/out-of-stock |
| Warning (amber) | `warning` / `warning-container` / `on-warning-container` | `#d97706` / `#fef3c7` / `#92400e` | Low stock, expiring, pending |
| Inverse | `inverse-surface` / `inverse-on-surface` | `#0f172a` / `#f1f5f9` | Tooltips, dark overlays |

**Brand shell (dark navy sidebar & marketing)**

| Token | Hex | Use |
| --- | --- | --- |
| `brand` | `#0b1220` | Sidebar / marketing dark background |
| `brand-elevated` | `#0f1830` | Raised dark panels |
| `brand-foreground` | `#e2e8f0` | Text on dark |
| `brand-muted` | `#94a3b8` | Secondary text on dark |
| `brand-border` | `#1e293b` | Dividers on dark |
| `brand-accent` | `#3b82f6` | Accent on dark |

> **Color usage rules**
> - Emerald (`secondary`) is reserved for *positive* meaning. Don't use it as a generic accent.
> - Status meaning is desaturated: low stock = pale amber bg + dark amber text, etc.
> - Never hard-code `text-blue-600` / `bg-slate-100`; use `text-primary` / `bg-surface-container`.

### 2.2 Typography

Triple-font strategy (wired in `src/lib/fonts.ts`, loaded via `next/font`):

- **Geist** (`font-display`) — headlines & display. Sharp, technical.
- **Inter** (`font-sans`, default body) — body copy & UI labels. Legible in dense tables.
- **JetBrains Mono** (`font-mono` / `font-data-mono`) — **all numeric data** (quantities,
  prices, SKUs, lot IDs): distinguishes `0`/`O`, gives data a scannable rhythm.

**Type scale** (each token sets size/line-height/weight/tracking — use the matching
`font-*` family token alongside the `text-*` size token):

| Token | Size / line-height | Weight | Family | Use |
| --- | --- | --- | --- | --- |
| `text-display-lg` | 40 / 46, −0.025em | 600 | Geist | Marketing hero, big numbers |
| `text-headline-lg` | 28 / 34, −0.02em | 600 | Geist | Page titles (`PageHeader`) |
| `text-headline-lg-mobile` | 22 / 28, −0.02em | 600 | Geist | Page titles on mobile |
| `text-headline-md` | 20 / 28, −0.01em | 600 | Geist | Section headings |
| `text-body-lg` | 17 / 26 | 400 | Inter | Lead paragraphs, card titles |
| `text-body-md` | 15 / 24 | 400 | Inter | Default body |
| `text-body-sm` | 13.5 / 20 | 400 | Inter | Secondary body, table cells |
| `text-label-md` | 14 / 20 | 500 | Inter | Buttons, input labels |
| `text-label-sm` | 12 / 16 | 600 | Inter | Eyebrow labels, badges (UPPERCASE) |
| `text-data-mono` | 13 / 20 | 400 | JetBrains Mono | Inline data |

Add `.tabular` (`font-variant-numeric: tabular-nums`) to numeric columns that must align.

### 2.3 Spacing & grid

- **4px baseline.** Spacing tokens: `xs` 4 · `sm` 8 · `md` 16 · `lg`/`gutter` 24 · `xl` 40 · `margin` 32.
- Use 40px+ "breathing zones" between major sections to reduce medical-software anxiety.
- **Containers:** `max-w-content` = 1280px (app content), `max-w-container-max` = 1440px (wide shells).
- **Dashboard bento grid:** `.bento-grid` = 12 columns, 20px gap. Compose with `col-span-12 xl:col-span-8` etc.
- `safe-bottom` / `pb-safe` / `h-safe-bottom` respect the iOS home-indicator inset for the mobile tab bar.

### 2.4 Radius

`sm`/DEFAULT 6px · `md` 8px · `lg` 10px (buttons, inputs) · `xl` 14px (**cards**) · `2xl` 18px · `3xl` 24px (large containers/modals) · `full` (pills/badges).

### 2.5 Elevation

Depth comes from **tonal layering + hairline borders**, not heavy shadows.

| Token | Value | Use |
| --- | --- | --- |
| `shadow-xs` / `shadow-sm` | `0 1px 2px` slate | Inputs, secondary buttons |
| `shadow-card` | `0 1px 2px + 0 1px 3px` slate | **Default card/table resting state** |
| `shadow-card-hover` | `0 8px 24px -8px …` | Interactive lift on hover |
| `shadow-elevated` | `0 12px 32px -12px …` | Dialogs, popovers, dropdowns |
| `shadow-brand-glow` | `0 8px 30px -12px primary` | Brand emphasis / marketing CTAs |

### 2.6 Motion

- Buttons: `transition-all duration-150`, `active:scale-[0.98]`, `hover:brightness-110`.
- Cards/tiles: `duration-200`, `hover:-translate-y-0.5` + `shadow-card-hover`.
- Entrances: `animate-fade-in-up` (0.35s `cubic-bezier(0.16,1,0.3,1)`).
- Accordions: `animate-accordion-down/up` (0.2s). Keep motion subtle and fast; respect reduced-motion.

### 2.7 Breakpoints

Tailwind defaults + custom `xs: 475px`. Two structural switches:

- **`lg` (1024px)** — app shell shows the fixed sidebar; below it, the topbar hamburger
  drawer + bottom tab bar take over. `DataTable` shows a `<table>` at `lg:` and stacked cards below.
- Cards/grids generally go 1-col (mobile) → 2-col (sm/md) → 3-col (xl).

### 2.8 Iconography

[`lucide-react`](https://lucide.dev). Default stroke icons; **18px** inside buttons (set by
`buttonVariants`), 20px (`h-5 w-5`) in stat chips, 24px (`h-6 w-6`) in empty/error states.
Pair status text with an icon or dot for non-color-dependent meaning.

---

## 3. Core UI primitives (`src/components/ui/`)

All are token-styled, `cn()`-composable, and forward refs. Radix primitives back the
interactive ones (Dialog, Select, Dropdown, Popover, Tabs, Tooltip, Switch, Checkbox, etc.).

### Button — `button.tsx`
`cva` variants × sizes. Props: `variant`, `size`, `loading` (shows `Loader2` spinner +
disables), `asChild` (render as `<Link>` etc. via Radix Slot).

- **Variants:** `primary` (default, brand blue) · `success` (emerald — *stock-in/confirm only*) ·
  `secondary` (bordered, white) · `outline` · `ghost` · `destructive` (red) · `link`.
- **Sizes:** `sm` (h-8) · `default` (h-10) · `lg` (h-11) · `icon` (10×10).
- Built-in focus ring, `active:scale-[0.98]`, disabled opacity.

### Input — `input.tsx` (+ `textarea.tsx`, `select.tsx`, `label.tsx`, `switch.tsx`, `checkbox`)
h-10, `rounded-lg`, hairline border. Focus → `border-primary` + `ring-primary/30`.
Validation: set `aria-invalid="true"` to get `border-error` + error ring automatically.

### Badge — `badge.tsx`
Pill (`rounded-full`), `text-label-sm`, optional leading **`dot`**.
Variants: `neutral` · `primary` · `success` · `warning` · `error` · `critical`.

### Card — `card.tsx`
`Card` (= `bg-surface-container-lowest` + `border-outline-variant` + `rounded-xl` +
`shadow-card`) with `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` /
`CardFooter` (p-6 rhythm). The `.card-surface` utility in `globals.css` is the same recipe
for one-off divs.

### Skeleton — `skeleton.tsx`
`animate-pulse` on `bg-surface-container-high`. Size with `className` (`h-7 w-28`).

### Others
`dialog`, `dropdown-menu`, `popover`, `tooltip`, `tabs`, `avatar`, `separator`,
`scroll-area`, `spinner`, `toaster` (Sonner). Dialogs use `rounded-3xl` + `shadow-elevated`
and must keep an accessible title.

---

## 4. Composite / shared components (`src/components/shared/`)

These encode product conventions — **prefer them over hand-rolling**.

| Component | What it gives you |
| --- | --- |
| **`DataTable<T>`** | The backbone of every list view. Typed `columns` + `data`; renders a `<table>` on `lg:` and **auto-generated stacked cards on mobile** (no horizontal scroll). Built-in **loading** (skeleton rows), **empty** (`EmptyState`), and **error** (`ErrorState` + `onRetry`) states. Rows are keyboard-accessible when `onRowClick` is set. Use `align`, `hideOnMobile`, and `id: "actions"` columns. |
| **`StatCard`** | KPI tile: colored icon chip, uppercase label, mono value, optional `pill` ("Urgent"/"Review") or signed `delta` (auto up/down + color), `loading` skeleton. Tones: `default` · `success` · `error` · `review`. |
| **`StatusBadge`** | Maps a domain status string (bill / shop / subscription / stock / AI) → the right `Badge` variant, humanizes the label, shows a dot. Use this for *all* status pills so meaning stays consistent app-wide. |
| **`EmptyState`** | Dashed-border panel: icon-in-circle + title + description + optional `action`. |
| **`ErrorState`** | Error-container panel: `AlertTriangle` + parsed `errorMessage(error)` + optional "Try again". |
| **`FormField`** | Label-above-control wrapper for React Hook Form: required asterisk, inline error/hint. |
| **`PageHeader`** | Title (`headline-lg`) + description + right-aligned `actions`; stacks on mobile. |
| **`Pagination`**, **`ConfirmDialog`**, **`ChartKit`** | List pagination; promise-based confirm dialog; Recharts wrappers themed to the tokens (use these so charts inherit palette + are responsive via `ResponsiveContainer`). |

**Standard page skeleton**

```tsx
<div className="space-y-6">
  <PageHeader title="Medicines" description="Your pharmacy's catalog." actions={<Button>Add medicine</Button>} />
  <DataTable columns={columns} data={data} rowKey={(r) => r.id} isLoading={isLoading} isError={isError} onRetry={refetch} />
</div>
```

---

## 5. Layout & navigation (`src/components/layout/`)

`AppShell` wraps every authenticated route (`(app)/layout.tsx` → `AuthGuard` → `AppShell`):

- **Desktop (`lg+`):** fixed dark **`sidebar`** (brand navy) with grouped nav
  (Inventory / Sales / Insights / Manage), `topbar` (page title, medicine search, notifications,
  user menu), and a `subscription-banner` when relevant.
- **Mobile/tablet (`<lg`):** `topbar` hamburger opens the `mobile-nav` drawer; a fixed
  `mobile-tab-bar` (Dashboard / Sell / Medicines / Bills / More) sits at the bottom with
  `pb-safe` inset.
- Route groups: `(auth)` (login/register, centered card) and `(app)` (shell). Access is
  gated by `AuthGuard` (session) + `RoleGuard` (`shop_owner` / `shop_staff` / `central_admin`).

---

## 6. State patterns

| State | Pattern |
| --- | --- |
| **Loading** | Skeletons that match final layout (via `DataTable` / `StatCard loading` / `Skeleton`). Full-route auth restore uses the centered `page-loader`. Avoid bare spinners for content. |
| **Empty** | `EmptyState` with a helpful title, one-line description, and a primary `action` when the user can create the missing thing. |
| **Error** | `ErrorState` with a human message + `Try again`. Mutations surface failures via Sonner toasts. |
| **Permission** | Gate with `RoleGuard`; show a clear "not available for your role" message rather than a blank screen. |
| **Success** | Toast confirmation (Sonner) + optimistic/refetched data. |

---

## 7. Accessibility conventions

- **Focus:** global `*:focus-visible` ring (`ring-2 ring-primary/70 ring-offset-2`) — never
  remove it; rely on it for keyboard users. Inputs add `focus:ring-primary/30`.
- **Semantics:** real `<button>`/`<a>`, `<table>` for tabular data, `<dl>` for the mobile
  card key/value pairs, headings in order. Icon-only controls need an `aria-label`.
- **Color independence:** status carries a dot/icon + text, not color alone.
- **Keyboard:** interactive `DataTable` rows handle Enter/Space; dialogs trap focus (Radix);
  the mobile drawer is dismissible.
- **Targets:** controls are ≥ 40px high (h-10) for touch.
- Target **WCAG AA** contrast on text; the `on-*` tokens are paired to their surfaces to hit it.

---

## 8. Responsive strategy

1. **Mobile-first.** Default styles target small screens; layer `sm:` / `md:` / `lg:` / `xl:` up.
2. **No horizontal scroll, ever.** Tables become cards (`DataTable`); wide rows wrap or hide
   non-essential columns (`hideOnMobile`).
3. **Navigation transforms** at `lg` (sidebar ⇄ drawer + bottom tab bar).
4. **Charts** use Recharts `ResponsiveContainer` (via `ChartKit`) so they reflow.
5. Verify each screen at 375 / 768 / 1024 / 1440 (and ultrawide centered by `max-w-content`).

---

## 9. Do / Don't

**Do** — compose shared components; style via tokens; keep numerics in mono; design the
empty/error/loading state with the happy path; pair status with dot/icon.

**Don't** — hard-code hex or non-token Tailwind colors; use emerald as a neutral accent;
remove focus rings; build a bespoke table (extend `DataTable`); ship a screen whose loading
or empty state is undesigned.

---

## 10. Re-skinning

All visual values are tokens in `tailwind.config.ts` (colors, radius, spacing, type scale,
shadows, motion) plus the base layer in `src/app/globals.css`. To re-theme, change the token
**values** there; component markup references token **names** only, so the whole app updates
without edits to feature code.
