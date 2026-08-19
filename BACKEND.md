# Backend reference

## Status and stack

Backend root: `backend/`. A separate ESM Node.js package using Express 5, MySQL 8 (via `knex` + `mysql2`), JWT sessions (Google ID token verified server-side, then a SiTIKET-issued JWT), `zod` validation, and `multer` for local-disk file uploads. The full v1 domain model from [docs/business/](docs/business/README.md) is implemented: auth, admin onboarding, events, ticket types, promo codes, orders/checkout with atomic inventory reservation, manual payment verification (bank transfer and per-event opt-in QRIS), QR ticket issuance, gate check-in, manual refunds, and per-organizer outgoing email (every buyer-facing email is sent through the event organizer's own SMTP — see § _Email delivery_).

Not yet implemented (see § _Known gaps_): automated tests, a payment gateway (Midtrans/Xendit — deferred by design, see [docs/business/PAYMENT_VERIFICATION.md](docs/business/PAYMENT_VERIFICATION.md)), and production-grade file storage (uploads currently live on local disk).

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
| QRIS config | `GET/PUT/DELETE /qris-config` — one static QRIS per organizer (PUT is multipart: `qrisImage` file + `merchantName`); events opt in via `qrisEnabled` |
| Email config | `GET/PUT /email-config`, `POST /email-config/google` — one config per organizer: `custom` SMTP via PUT (host/port/secure, live-verified before saving) or Gmail via the OAuth code exchange (`POST /google` with `{code, redirectUri}` from the frontend's Connect Gmail flow); **required before creating events** |
| Events | `GET/POST /events`, `GET /events/mine`, `GET /events/:slug`, `PATCH /events/:id`\|`:id/status`\|`:id/visibility` |
| Event sub-resources | `GET/POST/DELETE /events/:eventId/images`, `/staff`, `GET/POST/PATCH /events/:eventId/ticket-types`, `/promo-codes`, `GET /events/:eventId/orders` |
| Orders | `POST /orders`, `POST /orders/:id/verify-guest-email`, `GET /orders/mine`\|`:id`\|`:id/guest`, `POST /orders/:id/cancel` |
| Payments | `GET /orders/:orderId/payments/instructions` (destination bank account(s) and/or QRIS + amount to show the buyer), `POST /orders/:orderId/payments` (proof upload, optional `method`: `bank_transfer`\|`qris`), `GET /orders/:orderId/payments`, `POST /order-payments/:id/approve`\|`reject` |
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
- A ticket is marked `paid`-order-issued only after a payment proof is explicitly approved by the event owner (or super_admin) — see [docs/business/PAYMENT_VERIFICATION.md](docs/business/PAYMENT_VERIFICATION.md). Bank transfer and QRIS are both manual-proof methods sharing this exact review flow; `order_payments.method` records which one the buyer used, and `services/payment-method-service.js` (`resolvePaymentOptionsForEvent`) is the single source of truth for which methods an event offers — order creation fails fast (`EVENT_NO_PAYMENT_METHOD`) when an organizer has neither a payout account nor event-enabled QRIS.
- A new order holds its reserved inventory for `ORDER_PAYMENT_HOLD_MINUTES` (default **10**), stamped onto `orders.payment_expires_at` at creation. Abandoned `pending_payment` orders are swept every **60 seconds** by `server.js` (`services/order-service.js` `expireStalePendingOrders`), releasing held inventory/promo usage and emailing the buyer. The interval is kept well under the hold on purpose: the buyer watches a live countdown against the same deadline, so a coarse sweep would deliver the "window closed" email long after their clock ran out. Independently of the sweep, `services/order-payment-service.js` refuses a proof upload once `payment_expires_at` has passed (`ORDER_EXPIRED`) — the timestamp, not the sweep, is the authority.
- Each ticket's QR payload is HMAC-signed (`utils/qr-token.js`) and check-in transitions `issued → used` via a guarded atomic `UPDATE`, so two simultaneous scans of the same ticket can't both succeed — see `services/ticket-service.js` and [docs/business/CHECKIN_GATE_SYSTEM.md](docs/business/CHECKIN_GATE_SYSTEM.md).

## Email delivery

- **Per-organizer SMTP.** Every buyer-facing email (guest OTP, ticket delivery on approval, proof rejection, order cancelled/expired, all refund statuses) is enqueued with `email_jobs.owner_id` and delivered through that organizer's `organizer_email_configs` row — `From:` is the organizer's own address. Platform emails (admin-application notifications) keep using the env-configured SMTP (`SMTP_HOST` etc.).
- **Config is a hard prerequisite for creating events**: `POST /api/events` throws 409 `EMAIL_CONFIG_REQUIRED` until the owner sets up email. Two paths: **Gmail via OAuth** — `POST /api/email-config/google` exchanges the consent-flow authorization code (scope `gmail.send` only, deliberately not the restricted full-mail scope), stores the refresh token AES-encrypted, and the worker delivers through the Gmail REST API (`config/gmail-mailer.js`; needs `GOOGLE_CLIENT_SECRET` in env). **Custom SMTP** — `PUT /api/email-config` live-verifies the login (`transporter.verify()`) before storing, so a saved config is always a deliverable one. Legacy `gmail` rows saved with an App Password still deliver over SMTP. A revoked/expired Google grant makes the job fail with a "reconnect Gmail" error in `email_jobs.last_error`.
- **Secrets at rest**: SMTP passwords are AES-256-GCM encrypted (`utils/secret-box.js`) with a key derived from `EMAIL_CONFIG_SECRET` (recommended in production) or, when unset, from `JWT_SECRET`.
- **Worker semantics** (`services/email-job-service.js`, 3s interval in `server.js`): jobs routed to an organizer whose config has since disappeared (legacy events pre-dating the requirement, or a deleted config) fall back to the platform SMTP; when no transport at all is available the job retries with backoff and ends `failed` — it is never silently marked sent, so `email_jobs.status = 'failed'` rows are meaningful.

## Known gaps / follow-ups

- **JWT role claims don't live-update.** A session JWT embeds `role` at sign-in time. If a Super Admin approves someone's Admin application (or changes anyone's role) mid-session, the affected user must sign in again to get a token reflecting the new role — there is no server-side session/role revalidation per request. Standard stateless-JWT tradeoff; consider shorter token lifetimes or a role-refresh endpoint if this becomes a real friction point.
- **No email-config management beyond replace.** An organizer can overwrite their email config but not delete it (deliberate — it's a prerequisite), and there's no "send test email" endpoint beyond the verify-on-save handshake. The guest OTP still logs server-side and echoes in the response outside `NODE_ENV=production` when no transport is available, so dev checkout works without SMTP.
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
