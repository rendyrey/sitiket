---
name: develop-sitiket-backend
description: Implement and maintain the SiTIKET ESM Node.js and Express backend with safe API contracts, validation, business services, persistence boundaries, ticket inventory, orders, authentication, payments, webhooks, and tests. Use for any work under backend/ or when connecting the frontend to real SiTIKET APIs.
---

# Develop SiTIKET Backend

Build backend capabilities safely while the current Express package evolves from scaffold to production API.

## Load context selectively

1. Read the root `AGENTS.md` and `backend/AGENTS.md`.
2. Read `BACKEND.md` before adding endpoints, domain models, persistence, authentication, inventory, orders, payments, or deployment behavior.
3. Inspect only the affected routes and adjacent backend modules.

## Follow the implementation workflow

1. Define the API contract first: method, path, authentication, input schema, output, errors, and idempotency behavior.
2. Validate all params, queries, bodies, headers, and webhooks at the HTTP boundary.
3. Keep responsibilities separated:
   - `server.js` → startup and listen only
   - `app.js` → middleware and router composition
   - routes → declarations
   - controllers → HTTP translation
   - services → business rules and transactions
   - repositories → persistence
4. Add only the layers required by real behavior; do not create empty architecture.
5. Return consistent JSON with correct status codes. Do not expose stack traces, secrets, or provider payloads.
6. Add or update `.env.example` with variable names only.
7. Add tests with every real endpoint or business rule.

## Enforce ticketing invariants

- Recalculate prices, fees, discounts, and totals on the backend.
- Treat browser identity and availability claims as untrusted.
- Reserve and release inventory transactionally to prevent overselling.
- Make order creation and webhook handling idempotent.
- Model explicit order, reservation, payment, ticket, and check-in states.
- Mark payment successful only after verifying the provider webhook signature, order, currency, and amount.
- Issue unguessable tickets only for confirmed orders.
- Keep placeholder routes returning `501` until their behavior is genuinely implemented.

## Verify

Run backend tests and lint/type checks introduced by the backend package. Until those scripts exist, at minimum:

1. install dependencies inside `backend/`;
2. start the server with a non-production `.env`;
3. exercise affected success and failure responses;
4. confirm no real credentials or generated secrets are tracked.
