# Backend agent instructions

Applies to `backend/`. Read root `AGENTS.md` and `BACKEND.md`; their rules remain active.

- This is a separate ESM Node.js/Express package, not a Next.js API route.
- Keep `server.js` limited to process startup and `app.js` limited to middleware/router composition.
- Organize new behavior as `routes -> controllers -> services -> repositories` when those layers become necessary.
- Validate all external input and return a consistent JSON error shape.
- Never trust prices, totals, ticket availability, or identity sent by the frontend.
- Payment confirmation must come from a verified provider webhook, not the browser redirect.
- Orders and inventory updates must be atomic/idempotent.
- Keep secrets in environment variables and update `.env.example` with names only.
- Add tests with the first real business logic or endpoint implementation.
- Preserve the current `501` placeholder behavior until a route is genuinely implemented.
