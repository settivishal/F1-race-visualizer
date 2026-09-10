# Handoff: Landing Page Hero v2 ("2c")

## Overview
A restructured version of the landing page hero + top sections, explored as wireframe option "2c" during design review. Bolder hero (headline + copy + CTA over a full-bleed chart), a pinned lap-scrubber rail at the hero's bottom edge, and a reordered stack of season sections below, ending in an expanded "title race" card and a footer.

## About the Design Files
The bundled file (`Landing Page Wireframes.dc.html`) is a **design reference built in HTML** — a prototype of layout, structure, and motion, not production code to copy directly. Implement this in the app's existing stack (Next.js + Tailwind + the existing `src/components/home/*` components), reusing real data and existing components wherever the structure matches — do not port the wireframe's inline styles or placeholder markup as-is.

## Fidelity
**Low-fidelity.** Boxes, dashed placeholders, and hand-drawn-style labels stand in for real content and exact styling. Use this only for layout, section order, and interaction/motion intent. All colors, type, spacing, and component styling should follow the app's existing Tailwind theme and `src/app/globals.css` tokens, not anything in the wireframe.

## Screens / Views

### Landing page — hero + top sections (option "2c")
**Purpose:** Home page (`src/app/(public)/page.tsx`), from the top through the title-race section.

**Layout, top to bottom:**
1. **Hero** — full-bleed background chart (maps to `HeroReplay`), headline + supporting paragraph + CTA left-aligned over the chart, and a control rail pinned to the hero's bottom edge containing the lap scrubber and lap counter (`Lap {n}/{max}`) — the CTA button moves out of this rail and sits under the headline instead.
2. **Season status** — full width, adds a fill-animated progress bar (maps to `SeasonStatus`).
3. **Last time out (podium)** — full width; first-place slot gets a highlight/glow treatment (maps to `LatestResult`).
4. **Season pulse** — full width; dots arranged along a gentle wave/curve instead of a flat grid, with a dashed guide line and a "N of M run" label (maps to `SeasonPulse`; the curved arrangement is a new layout the current grid version doesn't have — needs new CSS, data shape unchanged).
5. **The title race** — full width card: Leader / points-gap number / Second, plus a one-line summary and a "Full standings" link (maps to `ChampionshipFight`, closer to its real desktop layout than the compact card tried earlier in exploration).
6. **Footer** (new) — logo mark, nav links (Races, Drivers, Teams, Standings, About), and a small data-attribution note. No footer exists in the app today — this is a net-new section to design/build.

## Interactions & Behavior
- Hero chart's three polylines draw in on load (staggered ~150ms apart), not just appear.
- Season status, podium, pulse, and title-race cards fade + lift in on load, staggered.
- Season-pulse dots fade in individually along the curve, staggered.
- Lap counter in the hero rail counts up from 1 to the current lap on load (~900ms).
- Title race's point-gap number counts up from 0 to its value on load, same timing as the lap counter.
- Season status progress bar animates its fill width in on load.
- P1 podium slot has a soft pulsing glow (subtle, repeats every ~2.2s).
- CTA button scales up slightly on hover; footer/nav links and "Full standings" underline on hover.
- All load animations are one-shot; no scroll-triggering (an intersection-observer approach was tried and reverted — reliability issues at low effort, not for lack of value. Reconsider if you want animations to replay when a section is deep enough on a real long page that it wouldn't be visible on load).

## State Management
- Lap counter and points-gap counter are local UI animation state only (mount-time interval), not app state — implement as a simple `useEffect` + `useState` tween, or with `framer-motion` (already a dependency) if preferred.
- No new data requirements: all sections map to existing GraphQL queries (`getSeasonSchedule`, `getLatestResult`, `getSeasonPulse`, `getDriverStandings`, `getFeaturedRace`).

## Design Tokens
Use the app's own tokens (`src/app/globals.css`, `src/lib/theme.ts`) — none are defined by the wireframe. Notable existing classes to reuse: `text-eyebrow`, `type-section-title`, `type-page-title`, `tabular`, `text-accent`, `text-muted`, `bg-panel-strong`, `border-line`.

## Assets
None — wireframe uses placeholder boxes/lines only, no real icons or images.

## Files
- `Landing Page Wireframes.dc.html` — full wireframe exploration; option "2c" (anchor `#2c`) is the one this handoff describes. Other options (1a–1d, 2a, 2b) were earlier directions, not part of this handoff.
