# Frontend agent instructions

Applies to everything under `src/`. Read root `AGENTS.md` and `FRONTEND.md`; their rules remain active.

- Route files in `app/` load data, handle metadata/404s, and compose feature exports. Do not place large UI blocks there.
- Put domain UI and state in `features/<feature>/components`.
- Put reusable, domain-neutral controls in `components/ui`.
- Put global header, footer, logo, and brand-only elements in `components/site`.
- Export a feature's public components from its local `index.ts`; avoid importing private internals across features.
- Default to Server Components. Add `"use client"` only at the smallest state/event/browser boundary.
- Reuse `EventItem`, `events`, `getEvent`, and `formatPrice` from `data/events.ts` until an API layer replaces the mocks.
- Use Next.js `Link` and `Image`; keep accessibility labels, semantic elements, and responsive behavior.
- Follow the existing Tailwind tokens (`lime`, `ink`, `paper`) and shared classes in `app/globals.css`.
- Do not move new product code into legacy `core/`.
