# Business & Database Documentation

> AI entry point: read this file first, then open the topic document relevant to the task. This documents the *business domain* — roles, flows, and the relational schema. For frontend/backend engineering conventions, see the root [AGENTS.md](../../AGENTS.md), [FRONTEND.md](../../FRONTEND.md), and [BACKEND.md](../../BACKEND.md).

## Documentation map

- [System overview](./SYSTEM_OVERVIEW.md) — roles, confirmed v1 scope decisions, primary user journeys, feature status.
- [Database design](./DATABASE_DESIGN.md) — full relational schema, ERD, entity reference, and business-rule-to-constraint mapping.
- [Payment verification](./PAYMENT_VERIFICATION.md) — v1 manual bank-transfer flow, states, edge cases, and the future payment-gateway migration path.
- [Check-in / gate system](./CHECKIN_GATE_SYSTEM.md) — QR ticket lifecycle and in-app gate scanning flow.

## Status

This documents a **design/planning stage**: the repository currently has a UI-only frontend (`src/data/events.ts` mock data) and a placeholder Express backend (`BACKEND.md`) with no database yet. Nothing in `docs/business/` describes already-implemented behavior — treat it as the target design to build against, and update it in the same change set as any schema or business-rule change once implementation begins.
