# Backend reference

## Status and stack

Backend root: `backend/`. A separate ESM Node.js package using Express 5, MySQL 8 (via `knex` + `mysql2`), JWT sessions (Google ID token verified server-side, then a SiTIKET-issued JWT), `zod` validation, and `multer` for local-disk file uploads. The full v1 domain model from [docs/business/](docs/business/README.md) is implemented: auth, admin onboarding, events, ticket types, promo codes, orders/checkout with atomic inventory reservation, manual bank-transfer payment verification, QR ticket issuance, gate check-in, and manual refunds.

Not yet implemented (see § _Known gaps_): a real email-delivery provider, automated tests, a payment gateway (Midtrans/Xendit — deferred by design, see [docs/business/PAYMENT_VERIFICATION.md](docs/business/PAYMENT_VERIFICATION.md)), and production-grade file storage (uploads currently live on local disk).

## Local setup

```bash
cd backend
npm install
cp .env.example .env        # fill in GOOGLE_CLIENT_ID; JWT_SECRET/QR_SIGNING_SECRET can stay generated
npm run db:up                # docker compose up -d — starts a local MySQL 8 matching .env
npm run db:migrate           # applies all migrations in src/db/migrations
npm run db:seed              # seeds event_categories + ticket_categories (Super-Admin-managed taxonomy)
npm run dev
```

Default URL: `http://localhost:4000`. Never commit `.env` or real credentials — only `.env.example` is tracked (see root `.gitignore`).

**Becoming the first Super Admin**: there is no self-serve path to `super_admin` by design (see [docs/business/DATABASE_DESIGN.md](docs/business/DATABASE_DESIGN.md) §4.1). Sign in once via the frontend (or `POST /api/auth/google`) so a `users` row exists, then run:

```bash
npm run db:promote-super-admin -- you@example.com
```

## Current structure

```text
backend/
├── docker-compose.yml   # local MySQL 8 service
├── knexfile.js          # knex CLI config (migrations/seeds)
├── scripts/
│   └── promote-super-admin.js
├── uploads/             # local dev file storage (gitignored) — event images, payment proofs
└── src/
    ├── app.js           # middleware + all route mounts
    ├── server.js        # startup + the stale-order expiry sweep interval
    ├── config/          # env validation (zod), knex db client
    ├── db/
    │   ├── migrations/  # one file per table, see docs/business/DATABASE_DESIGN.md
    │   └── seeds/       # event_categories / ticket_categories
    ├── middleware/      # auth (JWT), validate (zod), upload (multer), rate-limit, error-handler
    ├── routes/          # route declarations, thin
    ├── controllers/     # req/response translation
    ├── services/        # business rules, transactions, authorization
    ├── repositories/    # knex queries, one module per table (+ a shared taxonomy factory)
    ├── schemas/         # zod request schemas, one per domain
    └── utils/           # http-error, id/ticket-code generation, qr-token (HMAC), slugify, presenters
```

## API surface

All routes are prefixed `/api`. Grouped by resource; `mine`/owner-scoped routes require `admin` or `super_admin`, taxonomy/user-management routes require `super_admin`.

| Resource | Routes |
| --- | --- |
| Auth | `POST /auth/google`, `GET /auth/me` |
| Users (Super Admin) | `GET /users`, `PATCH /users/:id/status` |
| Admin applications | `POST /admin-applications`, `GET /admin-applications`, `POST /admin-applications/:id/approve`\|`reject` |
| Taxonomy | `GET/POST/PATCH /event-categories`, `GET/POST/PATCH /ticket-categories` |
| Bank accounts | `GET/POST/PATCH /bank-accounts` |
| Events | `GET/POST /events`, `GET /events/mine`, `GET /events/:slug`, `PATCH /events/:id`\|`:id/status`\|`:id/visibility` |
| Event sub-resources | `GET/POST/DELETE /events/:eventId/images`, `/staff`, `GET/POST/PATCH /events/:eventId/ticket-types`, `/promo-codes`, `GET /events/:eventId/orders` |
| Orders | `POST /orders`, `POST /orders/:id/verify-guest-email`, `GET /orders/mine`\|`:id`\|`:id/guest`, `POST /orders/:id/cancel` |
| Payments | `GET /orders/:orderId/payments/instructions` (destination bank account + amount to show the buyer), `POST/GET /orders/:orderId/payments`, `POST /order-payments/:id/approve`\|`reject` |
| Tickets & check-in | `GET /tickets/mine`, `GET /orders/:orderId/tickets`, `POST /check-ins/scan` |
| Refunds | `POST/GET /orders/:orderId/refund-requests`, `GET /refund-requests/mine`, `POST /refund-requests/:id/approve`\|`reject`\|`complete` |

## API conventions

- Prefix endpoints with `/api` and use plural resources.
- Success shape: `{ "data": ... }` (optionally `"meta"` for pagination or the dev-only OTP code); error shape: `{ "error": { "code", "message", "details" } }` — see `middleware/error-handler.js` and `utils/http-error.js`.
- Every route validates its `body`/`query` via `middleware/validate.js` (zod). Note: Express 5 makes `request.query` getter-only, so `validate` mutates its keys in place rather than reassigning — keep that in mind if writing a new query-validating route by hand.
- Authorization is enforced in the service layer, not just routes: `utils/authorize-event-owner.js` (`assertEventOwnerOrSuperAdmin`) is reused by every event-scoped service (images, ticket types, promo codes, staff, payment review, refunds).

## Ticketing invariants (implemented)

- Backend prices/totals are always server-computed (`order_items.unit_price` snapshots `ticket_types.price`; `orders.total_amount` is never trusted from the client).
- Overselling is prevented by an atomic guarded `UPDATE ... WHERE quantity_sold + ? <= quantity_total` inside the order-creation transaction (`repositories/ticket-types-repository.js` `reserveInventory`) — see `services/order-service.js`.
- Promo code redemption is equally atomic (`repositories/promo-codes-repository.js` `incrementUsage`).
- Order/payment/refund/ticket states are explicit enums, not booleans — see docs/business/DATABASE_DESIGN.md for every state machine.
- A ticket is marked `paid`-order-issued only after a payment proof is explicitly approved by the event owner (or super_admin) — see [docs/business/PAYMENT_VERIFICATION.md](docs/business/PAYMENT_VERIFICATION.md).
- Abandoned `pending_payment` orders are swept every 5 minutes by `server.js` (`services/order-service.js` `expireStalePendingOrders`), releasing held inventory/promo usage.
- Each ticket's QR payload is HMAC-signed (`utils/qr-token.js`) and check-in transitions `issued → used` via a guarded atomic `UPDATE`, so two simultaneous scans of the same ticket can't both succeed — see `services/ticket-service.js` and [docs/business/CHECKIN_GATE_SYSTEM.md](docs/business/CHECKIN_GATE_SYSTEM.md).

## Known gaps / follow-ups

- **JWT role claims don't live-update.** A session JWT embeds `role` at sign-in time. If a Super Admin approves someone's Admin application (or changes anyone's role) mid-session, the affected user must sign in again to get a token reflecting the new role — there is no server-side session/role revalidation per request. Standard stateless-JWT tradeoff; consider shorter token lifetimes or a role-refresh endpoint if this becomes a real friction point.
- **No real email provider.** `services/email-verification-service.js` logs the guest-checkout OTP server-side and returns it in the response outside `NODE_ENV=production` — there is no SMTP/Resend/etc. integration yet. Order confirmations are similarly not emailed; a guest's only way to retrieve their tickets post-purchase today is `GET /orders/:id/guest?email=...`.
- **Local disk uploads.** `middleware/upload.js` writes event images and payment proofs to `backend/uploads/`. Swap the multer storage engine for a cloud-storage backend (GCS/S3) before any real deployment.
- **No automated tests yet.** Add them alongside the first real feature change per this project's `AGENTS.md`.
- **Payment gateway** (Midtrans/Xendit) is explicitly deferred — see the migration path in [docs/business/PAYMENT_VERIFICATION.md](docs/business/PAYMENT_VERIFICATION.md) §5.

## Local commands

```bash
cd backend
npm run dev                       # start API with --watch
npm run db:up / db:down           # docker compose up/down for local MySQL
npm run db:migrate / db:rollback  # apply / roll back migrations
npm run db:migrate:make <name>    # scaffold a new migration
npm run db:seed                   # re-run seeds (idempotent — insert-or-update by fixed id)
npm run db:promote-super-admin -- <email>
```
