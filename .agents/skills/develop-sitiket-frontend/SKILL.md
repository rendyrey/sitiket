---
name: develop-sitiket-frontend
description: Implement and maintain the SiTIKET Next.js frontend using its feature-based architecture, shared components, Tailwind design system, and typed event domain. Use for work under src/, including pages, layouts, event discovery, event details, checkout UI, authentication UI, responsive styling, accessibility, client state, frontend data access, and frontend refactors.
---

# Develop SiTIKET Frontend

Build frontend changes without weakening the repository's feature boundaries or visual system.

## Load context selectively

1. Read the root `AGENTS.md` and `src/AGENTS.md`.
2. Read `FRONTEND.md` for new features, architecture changes, data-flow changes, or unfamiliar placement decisions.
3. Inspect only the affected route, feature, and shared primitives. Do not scan `src/core` unless an existing legacy component is specifically needed.

## Follow the implementation workflow

1. Identify the owning feature: `auth`, `checkout`, `events`, or `home`.
2. Keep `src/app` routes thin: handle metadata, route parameters, data selection, `notFound`, and composition only.
3. Search existing feature components and `src/components/ui` before creating UI.
4. Place code by responsibility:
   - domain UI/state → `src/features/<feature>`
   - domain-neutral primitive → `src/components/ui`
   - global brand/chrome → `src/components/site`
   - shared configuration → `src/config`
5. Export a feature's public API from its local `components/index.ts`; avoid cross-feature private imports.
6. Default to Server Components. Add `"use client"` at the smallest state, event-handler, or browser-API boundary.
7. Pass typed data into presentational components. Keep fetching out of display components.
8. Implement the 320px mobile layout first with unprefixed Tailwind classes. Add breakpoint variants only after navigation, type, content, controls, and decorative effects fit without overlap or page-level horizontal overflow.
9. Stack or wrap dense phone layouts, keep touch targets at least 44px where practical, and use bounded horizontal scrolling only for intentional controls such as filter chips.
10. Preserve keyboard access, semantic HTML, labels, alt text, and visible focus while adapting interactions for touch.
11. Reuse Tailwind tokens `ink`, `paper`, and `lime`, plus shared classes in `src/app/globals.css`.

## Preserve product boundaries

- Treat `src/data/events.ts` as temporary mock data until a server-side API adapter replaces it.
- Treat checkout totals as previews; never imply the frontend is authoritative for price, inventory, payment, or identity.
- Do not claim authentication or payment is functional while the UI remains a surface.
- Avoid adding a dependency when Next.js, React, Tailwind, or an installed utility already solves the task.

## Verify

Run after implementation:

```bash
pnpm type:check
pnpm build
```

Also exercise changed interactive states at 320px, 375px, 768px, and a desktop width when browser tooling is available. Open mobile menus, inspect long content, and confirm the document has no horizontal overflow.
