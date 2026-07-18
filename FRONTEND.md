# Frontend reference

## Stack

- Next.js 16 App Router, React 19.2, TypeScript 5.8
- Tailwind CSS 3.4
- Next fonts: Inter for body text, Lexend Deca for display text
- Package manager: pnpm
- Auth: Google Identity Services (script tag, no SDK dep) → backend verifies → httpOnly session cookie via a Next.js Route Handler (BFF) — see § _Auth & data flow_
- Global client state: Jotai (session only, hydrated once from the server) — see `src/features/auth/lib/session-atom.ts`

Frontend root: `src/`. Static assets: `public/`. Backend: separate Express/MySQL API in `backend/` — see [BACKEND.md](BACKEND.md).

## Product routes

Public:
- `/`: landing page (real featured events)
- `/events`: event catalog, real category filters, search
- `/events/[slug]`: event details
- `/checkout/[slug]`: real checkout — multiple ticket types, promo code, guest or signed-in
- `/orders/[id]` (+ `?email=` for guests): order status — guest OTP verify, bank-transfer instructions, payment-proof upload, QR tickets, refund request
- `/login`: Google Sign-In

Signed-in:
- `/account`: purchase history, "my tickets" (QR codes), apply-for-Admin form

Admin (event owner), under `/dashboard/admin`:
- `/dashboard/admin`, `/events/new`, `/events/[slug]` (+ `/images`, `/ticket-types`, `/promo-codes`, `/staff`, `/orders`), `/bank-accounts`, `/refunds`

Super Admin, under `/dashboard/super-admin`:
- `/dashboard/super-admin` (applications), `/users`, `/event-categories`, `/ticket-categories`

Gate staff (owner, delegated `event_staff`, or super_admin — enforced backend-side per event, not by frontend role):
- `/dashboard/scan`: QR check-in, camera scan (via `BarcodeDetector` where supported) or manual paste

## Architecture

```text
src/
├── app/                 # routing, metadata, route data selection, Route Handlers
├── components/
│   ├── site/            # global SiTIKET chrome/brand
│   └── ui/              # domain-neutral primitives (+ DashboardShell)
├── config/              # shared configuration
├── data/                # EventItem type + formatPrice (still real; mock `events` array is unused)
├── lib/                 # api/ (client, types, normalize, errors), env, session, public-env
└── features/
    ├── auth/            # Google Sign-In, session atom/provider
    ├── events/           # public catalog + event detail (lib/api.ts, lib/to-event-item.ts)
    ├── checkout/         # real checkout flow
    ├── orders/           # order status, guest OTP, payment proof, refund request
    ├── account/          # purchase history, apply-for-Admin
    ├── admin/            # event-owner dashboard (lib/api.ts, lib/actions.ts, components/)
    ├── super-admin/      # taxonomy, admin applications, users
    ├── scanner/          # gate check-in
    └── home/
```

Feature internals should stay private. Import cross-feature public components from each feature's `components/index.ts` (not every feature has one yet — add it when another feature needs to import from it, per the existing barrel convention).

## Placement decision

1. Is it a route/framework concern? Put it in `app`.
2. Is it specific to one business capability? Put it in `features/<name>`.
3. Is it generic across business capabilities? Put it in `components/ui`.
4. Is it global site chrome or branding? Put it in `components/site`.
5. Is it configuration, cross-feature server plumbing (API client, session), or shared type/env access? Put it in `config` or `lib`.

Avoid premature abstraction: extract repeated behavior or a clear standalone responsibility, not every wrapper element.

## Auth & data flow

- **Sign-in**: `features/auth/components/google-sign-in-button.tsx` loads the Google Identity Services script and posts the resulting ID token to `app/api/auth/google/route.ts`, which forwards it to the backend, then sets an httpOnly `sitiket_session` cookie (`lib/session-cookie.ts`). The JWT itself never reaches client JS.
- **Reading the session**: `lib/session.ts` `getCurrentUser()` (server-only, `React.cache`-deduped) re-fetches `GET /api/auth/me` on every request rather than decoding the JWT — this always reflects the account's live role/status (a stale token's `role` claim is a known limitation, see BACKEND.md).
- **Reactive client UI** (e.g. the header): the root layout resolves `getCurrentUser()` once and hydrates a Jotai atom via `features/auth/components/session-provider.tsx`; client components read it with `features/auth/lib/use-session.ts`.
- **All backend reads**: a Server Component calls a feature's `lib/api.ts`, which calls `lib/api/client.ts` (`apiFetch`/`apiFetchPage`) — this reads the session cookie automatically and throws `ApiError` on a non-2xx response. Never fetch the backend directly from a Client Component.
- **All backend writes**: a Client Component calls a feature's `lib/actions.ts` Server Action directly (not via `<form action>`) and branches on the returned `{ ok: true, data } | { ok: false, message }` (see `lib/api/action-result.ts`), then calls `router.refresh()` on success to re-fetch fresh server data.
- **Wire-shape gotcha**: only 4 backend entities (User, Event, Order, Ticket) are camelCase with real booleans; the rest are raw snake_case rows with `0/1` for booleans. `lib/api/normalize.ts` converts each into a clean camelCase type of the same name — see the comment block at the top of `lib/api/types.ts` before adding a new entity.
- Checkout/order totals are always the backend's numbers (`Order.totalAmount`, etc.) — the checkout form computes a client-side subtotal for display only; the authoritative total (incl. any promo discount) comes back from `POST /api/orders`.

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
- The dashboard areas (`/dashboard/admin`, `/dashboard/super-admin`) use a fresh, minimal shell (`components/ui/dashboard-shell.tsx`) — not the legacy `src/core`/Hydrogen template, which is unrelated demo content and not wired into the live app.

## Responsive verification

For every UI change, exercise the affected route at 320px, 375px, 768px, and at least one desktop width. Verify navigation in both closed and open states, wrapping and overflow, text zoom/long content where relevant, and sticky or absolute elements near viewport edges. A production build alone does not prove responsive correctness.

**Known gap**: the dashboard pages built in this pass were verified via `type:check` + `build` + real HTTP route checks against live backend data (all return 200 with correct content), but not yet visually walked through at each breakpoint in a real browser — do that before calling any dashboard page done for a specific device size.

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

**Sandboxed/containerized environments**: if `pnpm install` reports success but `node_modules` ends up empty (hardlinks from the pnpm store silently failing to materialize), the repo's `.npmrc` already sets `package-import-method=copy` to work around it — re-run install after confirming that file is present.

## Environment

Copy `.env.example` to `.env` and fill in `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (must match the backend's `GOOGLE_CLIENT_ID` — same Google OAuth client). `API_BASE_URL`/`NEXT_PUBLIC_API_ORIGIN` default to the backend's local dev address (`http://localhost:4000`).
