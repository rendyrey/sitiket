# Frontend reference

## Stack

- Next.js 15 App Router, React 19, TypeScript 5.8
- Tailwind CSS 3.4
- Next fonts: Inter for body text, Lexend Deca for display text
- Package manager: pnpm

Frontend root: `src/`. Static assets: `public/`.

## Product routes

- `/`: landing page
- `/events`: event catalog and category query filter
- `/events/[slug]`: event details
- `/checkout/[slug]`: demo checkout surface
- `/login`: demo sign-in surface

## Architecture

```text
src/
├── app/                 # routing, metadata, route data selection
├── components/
│   ├── site/            # global SiTIKET chrome/brand
│   └── ui/              # domain-neutral primitives
├── config/              # shared configuration
├── data/                # temporary mock data/domain types
└── features/
    ├── auth/
    ├── checkout/
    ├── events/
    └── home/
```

Feature internals should stay private. Import cross-feature public components from each feature's `components/index.ts`.

## Placement decision

1. Is it a route/framework concern? Put it in `app`.
2. Is it specific to one business capability? Put it in `features/<name>`.
3. Is it generic across business capabilities? Put it in `components/ui`.
4. Is it global site chrome or branding? Put it in `components/site`.
5. Is it configuration or temporary data? Put it in `config` or `data`.

Avoid premature abstraction: extract repeated behavior or a clear standalone responsibility, not every wrapper element.

## Data flow

Event data currently comes from `src/data/events.ts`. Routes select the required records and pass typed props down. When the API is connected, introduce a server-side data-access module (for example `src/features/events/api`) and keep fetching out of presentational components.

Checkout state belongs to the checkout feature. The displayed total is a preview only; the future backend must recalculate authoritative totals and availability.

## Design conventions

- Brand colors: `ink` (`#0a0a0a`), `paper` (`#f1f1ee`), `lime` (`#b6ff00`).
- Reuse shared CSS component classes from `src/app/globals.css`.
- Keep uppercase editorial headings, hard borders, squared controls, and bold spacing.
- Mobile is the baseline, not a desktop reduction. Write the unprefixed Tailwind classes for a 320px viewport, then add breakpoint variants to enhance the layout as space becomes available.
- Prefer one-column flow, wrapping, and full-width actions on phones. Introduce multi-column grids and persistent desktop navigation only at the first breakpoint where their content fits comfortably.
- Horizontal scrolling is allowed only for a clearly bounded control such as filter chips. Site navigation and content must never overlap, escape their section, or create page-level horizontal scrolling.
- Use fluid or stepped typography for editorial headings, constrain decorative absolute elements and shadows, and test long event names, prices, labels, and localized content.
- Keep touch targets at least 44px where practical. Do not remove keyboard focus, semantic labels, or screen-reader context while adapting an interaction for touch.
- Preserve keyboard access, visible focus, labels, alt text, and semantic HTML.

## Responsive verification

For every UI change, exercise the affected route at 320px, 375px, 768px, and at least one desktop width. Verify navigation in both closed and open states, wrapping and overflow, text zoom/long content where relevant, and sticky or absolute elements near viewport edges. A production build alone does not prove responsive correctness.

## Component conventions

- Components and files use kebab-case files and PascalCase exports.
- Prefer named prop types and narrow unions.
- Default to Server Components; isolate client state with the smallest possible `"use client"` boundary.
- Use `ActionLink`, `FormField`, and `SectionHeading` before creating equivalents.
- Use feature barrel exports for public feature APIs.
- Do not duplicate event card, poster, grid, filter, or checkout panel implementations.

## Commands

```bash
pnpm dev
pnpm type:check
pnpm build
pnpm format
```

Run type checking and a production build after structural, routing, styling-system, or data-flow changes.
