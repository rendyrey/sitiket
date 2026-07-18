# SiTIKET API

The SiTIKET backend: a separate ESM Node.js/Express API backed by MySQL. Implements the full v1 domain from [../docs/business/](../docs/business/README.md) — auth, events, checkout, manual payment verification, QR ticketing, and gate check-in.

See [../BACKEND.md](../BACKEND.md) for the full reference (setup, structure, API surface, invariants, known gaps).

## Quick start

```bash
npm install
cp .env.example .env   # fill in GOOGLE_CLIENT_ID
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

API listens on `http://localhost:4000` by default.
