# Design

Visual system for AIRLUXO. Tokens are the source of truth in `src/index.css` (Tailwind v4
`@theme`); this file documents them so design work stays on-brand. When code and this file
disagree, the code wins — update this file to match.

## Theme

Uber-functional **monochrome × Swiss luxury automotive**. Warm off-white canvas, near-black
ink, a single champagne-gold jewel accent used sparingly. Light by default; dark surfaces
(`void`/`coal`) reserved for cinematic moments (how-it-works, hero overlays, map popups).
Restraint over decoration — the car imagery is the color; the UI is the gallery wall.

Register: **brand** (marketplace primary), with a calmer **product** mode for the dashboard.

## Color

OKLCH not currently used; tokens are hex in `@theme`. Roles:

| Token | Hex | Role |
|---|---|---|
| `ink` | `#0b0b0c` | Primary near-black: text, dark buttons, ink surfaces |
| `void` | `#050506` | Deepest dark surface (dark sections) |
| `coal` | `#161618` | Dark cards |
| `graphite` | `#2a2a2e` | Dark borders / hairlines |
| `paper` | `#f6f5f1` | Warm off-white — body background |
| `cloud` | `#ffffff` | Light cards / raised surfaces |
| `mist` | `#e7e4db` | Light hairlines / dividers |
| `stone` | `#76746d` | Muted text (light bg) |
| `ash` | `#a8a59b` | Faint text on dark |
| `gold` | `#b89150` | Champagne accent — the jewel, used sparingly |
| `gold-soft` | `#d8b878` | Gold on dark |
| `go` | `#3f7d5a` | Available / positive / success |

**Color strategy: restrained.** Tinted neutrals + one accent (gold) ≤10% of any surface.
Gold marks the single most important thing in a view (primary highlight, the booking jewel,
map pin), never as a default border or fill. No gradients in product UI; the two `.spotlight`
radial gradients are atmosphere-only. Red (`text-red-600`) is reserved for errors.

**Contrast / a11y (WCAG 2.1 AA):** `stone` (#76746d) on `paper`/`cloud` is the watch item —
fine for secondary/muted text, not for primary body or placeholders that need 4.5:1. Keep
body copy at `ink`. Don't lighten "for elegance".

## Typography

- **Display:** `"Clash Display"` (`.font-display`, letter-spacing -0.02em) — headings, prices,
  spec numbers, hero.
- **Body / UI:** `"Satoshi"` (`--font-sans`) — all running text and controls.
- Two families on a real contrast axis (expressive display + neutral grotesque body). Do not
  add a third unless a mono is genuinely needed.
- **`.wordmark`** — Clash Display 600, letter-spacing +0.06em (the AIRLUXO logotype, airier).
- **`.eyebrow`** — Satoshi 700, 0.66rem, tracking 0.28em, uppercase. Exists, but use sparingly:
  a deliberate label, NOT an eyebrow above every section (that's the AI tell to avoid).
- **`.tnum`** — tabular numerals; use on all prices, stats, dates so figures align.
- Hero scale via `clamp()`; keep display max around 3rem (current detail hero) and well under
  the 6rem ceiling. `text-wrap: balance` on big headings.
- `font-feature-settings: "ss01","cv01"` on body.

## Components

- **Cards / surfaces:** `cloud` on `paper`, hairline `border-mist`, `--radius-card: 22px`
  (Tailwind `rounded-[var(--radius-card)]`); smaller controls use `rounded-xl`/`rounded-2xl`.
  Soft, low, downward shadows only (e.g. `shadow-[0_30px_60px_-40px_rgba(11,11,12,0.4)]`) —
  never harsh. No nested cards.
- **Primary button:** `bg-ink text-cloud`, `rounded-2xl`, hover `bg-void`; full-width CTAs in
  the booking column. Label = verb + object ("Reserve now", "Confirm & continue").
- **Secondary / ghost:** bordered (`border-mist`/`border-ink/25`), transparent fill.
- **Pills / chips:** `rounded-full`, `border-mist bg-cloud`; gold variant
  (`border-gold/30 bg-gold/10 text-gold`) for premium tags (delivery, cross-border, protection).
- **Inputs:** `rounded-lg`/`rounded-xl`, `border-mist`, focus `border-ink`; **≥16px on mobile**
  (enforced) to stop iOS zoom. Placeholders `text-stone`.
- **Focus ring:** `.ring-lux` → 2px solid `gold`, 2px offset. Put it on every interactive element.
- **Badges/status:** `go` for available/positive; gold for verified/premium.

## Layout

- Booking detail: two columns on `lg` (`grid lg:grid-cols-[1.5fr_1fr]`), booking panel sticky.
- `gap-px` hairline grids for spec tiles (cells are `bg-cloud` over a `bg-mist` grid).
- Flex for 1D, Grid for 2D; responsive card grids `repeat(auto-fit, minmax(...))`.
- Generous spacing and one clear focus per view — the opposite of a dense marketplace.
- Atmosphere: `.grain` (5% multiply noise overlay) and `.spotlight` gradients for depth on
  dark sections. Custom warm scrollbar + sepia-warmed Leaflet map tiles (`.alx-map`).

## Motion

- Standard easing token **`--ease-lux: cubic-bezier(0.22,1,0.36,1)`** (ease-out-quint feel) —
  use it for entrances/transitions. No bounce, no elastic.
- Library: **`motion`** (Framer Motion) already in use for modal/detail transitions.
- Existing keyframes: `shimmer` (image placeholders), `marquee` (logo strip), `float-y`,
  `alx-pulse` (gold map-pin halo).
- **Reduced motion honored:** the detail hero gates its autoplay video on
  `prefers-reduced-motion`; every new animation needs a crossfade/instant fallback.
- Motion is intentional and sparing — a luxury calm, not constant movement.

## Anti-patterns (project-specific, on top of the global bans)

- No discount/deal loudness (orange CTAs, urgency banners) — see PRODUCT.md anti-references.
- No cream-bg generic-SaaS scaffolding, no eyebrow on every section, no identical card grids.
- No gradient text, no decorative glassmorphism, no neon. Gold is a jewel, not a wash.
