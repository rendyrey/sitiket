# Backend reference

## Status and stack

Backend root: `backend/`. It is a separate ESM Node.js package using Express 5, CORS, and dotenv. It is currently a scaffold, not a production API. No database, authentication, validation, inventory, or payment integration exists.

Current endpoints:

- `GET /api/health`: implemented health response
- `GET /api/events`: empty placeholder list
- `GET /api/events/:slug`: `501` placeholder
- `POST /api/orders`: `501` placeholder

## Current structure

```text
backend/
├── .env.example
├── package.json
└── src/
    ├── app.js            # middleware and routers
    ├── server.js         # process startup/listen only
    └── routes/           # HTTP route boundaries
```

As functionality grows, use:

```text
src/
├── config/              # parsed environment/configuration
├── controllers/         # HTTP request/response translation
├── middleware/          # auth, validation, errors, rate limits
├── repositories/        # persistence access
├── routes/              # route declarations
├── services/            # business rules/transactions
├── schemas/             # request/domain validation
└── utils/               # small domain-neutral helpers
```

Add a layer only when real logic requires it.

## API conventions

- Prefix endpoints with `/api` and use plural resources.
- Return JSON and correct HTTP status codes.
- Recommended success shape: `{ "data": ... }`.
- Recommended error shape: `{ "error": { "code": "...", "message": "...", "details": ... } }`.
- Validate params, queries, bodies, and provider webhooks at the boundary.
- Centralize errors; do not expose stack traces or secrets.
- Add pagination/filtering for list endpoints before datasets grow.

## Ticketing invariants

- Backend prices and fees are authoritative.
- Prevent overselling with transactional inventory reservation.
- Make order creation and webhook processing idempotent.
- Model order/payment states explicitly; do not use a single boolean.
- Mark an order paid only after verifying the provider webhook signature and amount.
- Expire abandoned reservations and release inventory.
- Generate tickets only for confirmed orders; each ticket identifier must be unguessable and single-use where appropriate.

## Suggested implementation order

1. Environment validation and consistent error middleware
2. Database and migrations
3. Event/venue/ticket-type read APIs
4. Authentication and authorization
5. Inventory reservation and order creation
6. Payment provider plus verified webhooks
7. Ticket issuance and check-in
8. Rate limiting, observability, tests, and deployment hardening

## Local commands

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default URL: `http://localhost:4000`. Never commit `.env` or real credentials.
