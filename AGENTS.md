# SiTIKET agent guide

## Purpose

SiTIKET is an event discovery and ticket-purchasing product. The current repository contains a production-buildable Next.js frontend and an isolated Express API scaffold. Checkout, authentication, persistence, inventory, and payments are UI/placeholders only unless a task explicitly implements them.

## Read only what you need

- Frontend work: read `FRONTEND.md` and `src/AGENTS.md`.
- Backend work: read `BACKEND.md` and `backend/AGENTS.md`.
- Cross-stack work: read both references.
- Do not scan the large legacy `src/core` library unless the task needs an existing component from it.

Repository skills are available under `.agents/skills`:

- `$develop-sitiket-frontend` for frontend implementation and refactoring.
- `$develop-sitiket-backend` for APIs and backend domain behavior.

## Repository map

- `src/app`: Next.js routes; keep these thin.
- `src/features`: business feature modules (`auth`, `checkout`, `events`, `home`).
- `src/components/ui`: generic reusable primitives.
- `src/components/site`: SiTIKET-wide layout and brand components.
- `src/data/events.ts`: temporary mock event source and domain type.
- `src/config`: shared configuration such as navigation.
- `public`: local static assets.
- `backend`: separate future Node.js/Express API package.
- `src/core`: inherited Isomorphic template library, not the default location for new SiTIKET code.

## Global rules

1. Preserve the black, off-white, and neon-lime visual language unless requirements change.
2. Prefer extending existing primitives/features over duplicating markup.
3. Keep framework concerns in routes, domain UI in features, and generic UI in `components/ui`.
4. Use strict types; do not use `any` without a documented boundary reason.
5. Do not add dependencies when the installed stack can solve the task.
6. Do not claim real auth, payment, inventory, or persistence behavior until it exists and is tested.
7. Preserve unrelated user changes.

## Required verification

Frontend changes:

```bash
pnpm type:check
pnpm build
```

Backend changes: add/run relevant tests when a test runner exists; at minimum verify the server starts and affected endpoints manually. Never use real payment credentials in development.
