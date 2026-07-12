# SiTIKET API scaffold

This directory is the starting surface for the future Node.js/Express backend. It includes health, event, and order route boundaries but deliberately has no persistence, authentication, inventory reservation, or payment logic yet.

## Start locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The API defaults to `http://localhost:4000`. Before production, add request validation, a database layer, authentication, rate limiting, inventory locking, payment webhooks, and automated tests.
