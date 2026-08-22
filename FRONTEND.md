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
- `/orders/[id]` (+ `?email=` for guests): order status — a live payment-window countdown (10-minute hold; ticks client-side, self-refreshes once it hits zero), guest OTP verify, payment instructions (bank transfer and/or the organizer's QRIS code, per what the event offers), payment-proof upload with a paid-by method choice, QR tickets, refund request
- `/login`: Google Sign-In
- `/privacy-policy`, `/terms-of-service`: legal pages (footer-linked; the privacy policy carries the Google API Limited Use disclosure required for OAuth consent-screen branding/verification)
- `/merch`: public merch storefront — typo-tolerant relevance search (plus embedding-based semantic matches when the backend has an embeddings provider configured — see BACKEND.md § _Merch invariants_), category chips, price-range filter, sort, and an infinitely scrolling grid (page 1 is URL-driven/server-rendered; later pages stream in through a Server Action + IntersectionObserver sentinel)
- `/merch/[slug]`: product detail — Shopee-style photo slider (up to 10), option-group chips with per-combination price/stock, quantity stepper, add-to-cart / buy-now
- `/cart`: cart grouped per seller (localStorage-persisted Jotai atom — `features/merch/lib/cart.ts`); anyone can fill a cart, checkout requires sign-in

Signed-in — the account area under `/account` shares the dashboard shell (`components/ui/dashboard-shell.tsx`: sidebar on desktop, nav strip on phones; auth in `app/account/layout.tsx`):
- `/account`: "My tickets" — QR codes grouped per event; each group header shows the event name/date/venue/city and the organizer
- `/account/orders`: ticket order history — every event-ticket order with its line items as bought (ticket types, unit prices, promo discount), totals, status, linking to `/orders/[id]`
- `/account/merch-orders`: merch order history — every merch purchase with its product line items (name, variant, unit price), shipping courier + cost, totals, status, linking to `/merch-orders/[id]`
- `/account/profile`: editable contact & delivery-address profile form (phone + street address + a cascading province→city→district→village region picker, `features/shipping/components/address-picker.tsx` — the village drives shipping quotes, so it's the merch checkout prerequisite), plus the apply-for-Admin form for `user`-role accounts
- `/merch/checkout`: profile address + per-seller order summary; each seller group shows its courier options (quoted live via `POST /api/shipping/quotes` from the seller's departure address to the buyer's village, cheapest preselected, only the seller's enabled couriers) with per-seller and grand totals = items + shipping; a multi-seller cart shows a confirmation modal ("N sellers → N separate payments") before creating one order per seller
- `/merch-orders/[id]`: merch order status — 24h payment-window countdown (reuses the ticket countdown), the seller's bank/QRIS instructions, "I have paid" proof upload, delivery details incl. the chosen courier + estimation, and an items/shipping/total breakdown

Header (all pages): cart indicator with a live badge, and — signed-in only — the notification bell (`features/notifications`), a dropdown polling `GET /api/notifications` every 60s for new ticket/merch buyer activity with unread badge + mark-all-read.

Admin (event owner), under `/dashboard/admin`:
- `/dashboard/admin`, `/events/new`, `/events/[slug]` (+ `/images`, `/ticket-types`, `/promo-codes`, `/staff`, `/orders`), `/bank-accounts`, `/qris`, `/email-settings`, `/refunds`
- `/shipping`: the seller's shipping departure address (same cascading region picker) + the couriers they offer (checkbox whitelist; all-checked stores "no restriction" so new vendor couriers auto-appear). **Required before selling merch** — `/merch/new` blocks with a link here when `GET /api/shipping-origin` returns null (backend enforces it too with 409 `SHIPPING_ORIGIN_REQUIRED`)
- `/merch`: the seller's product inventory (stock, units sold, revenue, enable/disable, soft delete); `/merch/new` + `/merch/[id]`: product form (incl. package weight in grams — drives shipping quotes), photo manager (max 10), and the option/variant matrix builder (up to 3 groups; every combination gets its own price/stock)
- `/merch/orders`: incoming merch orders — buyer + full shipping details per row (structured address down to the village, chosen courier + cost + estimation + weight), payment proofs reviewed inline (approve/reject), server-side search/filter/sort/pagination
- `/qris`: upload/replace the owner's static QRIS code (one per owner); each event then opts in via the "Accept QRIS payments" toggle on its Details form (backend rejects enabling without a config — `QRIS_CONFIG_MISSING`)
- `/email-settings`: the owner's outbound email identity. Gmail is one click — "Connect Gmail" runs a Google OAuth round-trip (`/api/auth/google-mail/start` → Google consent → `/api/auth/google-mail/callback`, CSRF-protected by an httpOnly state cookie) and the backend stores an encrypted refresh token; other providers fill in SMTP host/port/TLS, live-verified on save. **Required before creating events** — `/events/new` blocks with a link here when `GET /api/email-config` returns null (backend enforces it too with 409 `EMAIL_CONFIG_REQUIRED`)

Super Admin, under `/dashboard/super-admin`:
- `/dashboard/super-admin` (applications), `/users`, `/event-categories`, `/ticket-categories`, `/merch-categories` (with live product counts; delete is disabled while products use a category)

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
    ├── orders/           # order status, payment-window countdown, guest OTP, payment proof, refund request
    ├── account/          # purchase history, apply-for-Admin
    ├── admin/            # event-owner dashboard (lib/api.ts, lib/actions.ts, components/) — incl. merch products/orders managers
    ├── super-admin/      # taxonomy (incl. merch categories), admin applications, users
    ├── scanner/          # gate check-in
    ├── merch/            # public storefront, cart (Jotai + localStorage), checkout, merch order status
    ├── notifications/    # header bell — Server-Action polling, unread badge, mark-read
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
- **Event artwork**: `features/events/lib/to-event-item.ts` prefers the designated poster image but falls back to the first uploaded image — organizers rarely have an exact-resolution poster, and cards/hero must still show artwork. Backend-relative `/uploads/...` paths always resolve through `toAssetUrl` (`lib/public-env.ts`), which is also why `NEXT_PUBLIC_API_ORIGIN` must be the real public origin at build time.
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
