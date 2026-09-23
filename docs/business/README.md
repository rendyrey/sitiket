# Business & Database Documentation

> AI entry point: read this file first, then open the topic document relevant to the task. This documents the *business domain* — roles, flows, and the relational schema. For frontend/backend engineering conventions, see the root [AGENTS.md](../../AGENTS.md), [FRONTEND.md](../../FRONTEND.md), and [BACKEND.md](../../BACKEND.md).

## Documentation map

- [System overview](./SYSTEM_OVERVIEW.md) — roles, confirmed v1 scope decisions, primary user journeys, feature status.
- [Database design](./DATABASE_DESIGN.md) — full relational schema, ERD, entity reference, and business-rule-to-constraint mapping.
- [Payment verification](./PAYMENT_VERIFICATION.md) — v1 manual bank-transfer flow, states, edge cases, and the future payment-gateway migration path.
- [Check-in / gate system](./CHECKIN_GATE_SYSTEM.md) — QR ticket lifecycle and in-app gate scanning flow.
- [Mimin SiTIKET assistant](./WHATSAPP_BOT.md) — the WhatsApp bot, Telegram bot and website chat: buying tickets and merch (incl. address changes), organizer payment approval, Super Admin application review; who the assistant recognises, per-channel differences, and its safety rules.

## Status

These documents began as a pre-implementation design and are now **kept in sync with shipped behavior** — v1 is built and running in production (Next.js frontend, Express + MySQL backend; see [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) §5 for the feature-by-feature status). Read them as the current design of record.

Two consequences:

- Where a document states a concrete value (a hold duration, an interval, a limit), that value is the one in the code — update both in the same change set, and say what changed and when.
- Anything still unbuilt is marked explicitly (🔜 future / ❌ not in scope). Unmarked behavior is implemented.
