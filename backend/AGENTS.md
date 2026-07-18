# Backend agent instructions

Applies to `backend/`. Read root `AGENTS.md` and `BACKEND.md`; their rules remain active.

- This is a separate ESM Node.js/Express package, not a Next.js API route.
- Keep `server.js` limited to process startup (plus the stale-order sweep interval) and `app.js` limited to middleware/router composition.
- Follow the existing `routes -> controllers -> services -> repositories` layering (see `BACKEND.md` for the directory map); thin CRUD without real business logic may skip the `services`/`controllers` split (see `routes/taxonomy-router-factory.js`), but anything touching money, inventory, or authorization goes through a service.
- Validate all external input via `middleware/validate.js` (zod schemas in `schemas/`) and return the `{ error: { code, message, details } }` shape from `utils/http-error.js`.
- Never trust prices, totals, ticket availability, or identity sent by the frontend — always recompute/re-check server-side (see `services/order-service.js`).
- Payment confirmation is manual in v1 (owner reviews an uploaded proof) — see [../docs/business/PAYMENT_VERIFICATION.md](../docs/business/PAYMENT_VERIFICATION.md). If a payment gateway is added later, confirmation must come from a verified provider webhook, never a browser redirect.
- Orders/inventory/promo-code/ticket-check-in updates must stay atomic — use the guarded-`UPDATE` + transaction pattern already in `repositories/ticket-types-repository.js`, `repositories/promo-codes-repository.js`, and `repositories/tickets-repository.js`, not a read-then-write race.
- Keep secrets in environment variables (validated in `config/env.js`) and update `.env.example` with names only.
- Add tests alongside the next real change to a route — none exist yet (see `BACKEND.md` § _Known gaps_).
- New tables need a knex migration under `src/db/migrations/` (`npm run db:migrate:make <name>`) mirroring the shape documented in [../docs/business/DATABASE_DESIGN.md](../docs/business/DATABASE_DESIGN.md) — update that doc in the same change.
