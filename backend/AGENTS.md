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
- Add tests alongside the next real change to a route — only unit tests (`npm test`, `*.test.js` next to the module) exist so far (see `BACKEND.md` § _Known gaps_).
- Assistant — WhatsApp bot + website chat (see `BACKEND.md` § _WhatsApp bot_ / § _Website chat_, business rules in [../docs/business/WHATSAPP_BOT.md](../docs/business/WHATSAPP_BOT.md)): new capabilities are MCP tools in `src/mcp/sitiket-tools.js` / `merch-tools.js` / `web-tools.js` that call existing services — never re-implement a business rule inside a tool. Give each tool the narrowest `roles` (and `channels` when its flow differs per channel — e.g. guest OTP on WhatsApp vs signed-in on the web), take identity only from the server-built context (`waId`, `staff`, `account`), never from model arguments, and gate every state-changing reviewer action with `isApprovalTypedByUser`. Bot replies/fixed copy are Bahasa Indonesia only. Buyer-facing WhatsApp sends must never block or fail the action they announce (fire-and-log, as in `services/whatsapp-ticket-service.js`).
- New tables need a knex migration under `src/db/migrations/` (`npm run db:migrate:make <name>`) mirroring the shape documented in [../docs/business/DATABASE_DESIGN.md](../docs/business/DATABASE_DESIGN.md) — update that doc in the same change.
