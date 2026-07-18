# SiTIKET agent guide

## Purpose

SiTIKET is an event discovery and ticket-purchasing product. The repository contains a production-buildable Next.js frontend and an Express/MySQL backend, and the frontend is wired to the real backend API end-to-end: Google Sign-In, public event browsing, real multi-ticket-type checkout with atomic inventory reservation, manual bank-transfer payment verification (guest OTP, proof upload), QR tickets, gate check-in scanning, an Admin dashboard (events/images/ticket-types/promo-codes/staff/bank-accounts/orders/payments/refunds), and a Super Admin dashboard (taxonomy/admin-applications/users). See `BACKEND.md` § _Known gaps_ and `FRONTEND.md` § _Responsive verification_ for what's still stubbed or unverified (real email delivery, a payment gateway, automated tests, per-breakpoint visual passes on the dashboards).

## Read only what you need

- Frontend work: read `FRONTEND.md` and `src/AGENTS.md`.
- Backend work: read `BACKEND.md` and `backend/AGENTS.md`.
- Cross-stack work: read both references.
- Database/business-domain work (schema, roles, payment, check-in flows): read `docs/business/README.md`.
- Do not scan the large legacy `src/core` library unless the task needs an existing component from it.

Repository skills are available under `.agents/skills`:

- `$develop-sitiket-frontend` for frontend implementation and refactoring.
- `$develop-sitiket-backend` for APIs and backend domain behavior.

## Repository map

- `src/app`: Next.js routes (including `/dashboard/admin`, `/dashboard/super-admin`, `/dashboard/scan`) and Route Handlers (`api/auth/*` — the session-cookie BFF); keep route files thin.
- `src/features`: business feature modules (`auth`, `events`, `checkout`, `orders`, `account`, `admin`, `super-admin`, `scanner`, `home`) — each with `components/` and a `lib/` of `api.ts` (server reads) + `actions.ts` (Server Action writes).
- `src/lib`: cross-feature server plumbing — `api/client.ts` (backend fetch wrapper), `api/types.ts` + `api/normalize.ts` (wire types, see the comment block at its top before adding an entity), `session.ts` (current-user resolution), `env.ts`/`public-env.ts`.
- `src/components/ui`: generic reusable primitives, including `dashboard-shell.tsx` (Admin/Super Admin sidebar layout).
- `src/components/site`: SiTIKET-wide layout and brand components.
- `src/data/events.ts`: `EventItem` type + `formatPrice` (still used); the mock `events` array/`getEvent` are unused now that events come from the API.
- `src/config`: shared configuration such as navigation.
- `public`: local static assets.
- `backend`: separate Node.js/Express + MySQL API implementing the v1 domain — see `BACKEND.md`.
- `docs/business`: business/product overview and database design — implemented by `backend` and consumed end-to-end by the frontend.
- `src/core`: inherited Isomorphic template library, not the default location for new SiTIKET code — not reused by the dashboard shell either (see FRONTEND.md § _Design conventions_).

## Global rules

1. Preserve the black, off-white, and neon-lime visual language unless requirements change.
2. Build frontend UI mobile-first. The unprefixed layout must work at 320px; add `xs:`, `sm:`, `md:`, and larger variants only as progressive enhancements.
3. Never rely on clipped page overflow to hide a layout bug. Navigation, headings, controls, cards, tables, and decorative effects must wrap, scroll within an intentional region, or reflow without overlapping at phone widths.
4. Keep interactive controls at least 44px high/wide where practical, and verify keyboard access and visible focus alongside touch use.
5. Prefer extending existing primitives/features over duplicating markup.
6. Keep framework concerns in routes, domain UI in features, and generic UI in `components/ui`.
7. Use strict types; do not use `any` without a documented boundary reason.
8. Do not add dependencies when the installed stack can solve the task.
9. Do not claim real auth, payment, inventory, or persistence behavior until it exists and is tested.
10. Preserve unrelated user changes.

## Required verification

Frontend changes:

```bash
pnpm type:check
pnpm build
```

Also inspect affected routes at 320px, 375px, 768px, and a desktop width. Check the mobile menu and any horizontal lists in their open/interactive states, and confirm there is no page-level horizontal overflow.

Backend changes: add/run relevant tests when a test runner exists; at minimum verify the server starts and affected endpoints manually. Never use real payment credentials in development.
