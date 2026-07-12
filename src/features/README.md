# Feature modules

Each directory owns one business capability and keeps its UI composition close to that domain:

- `auth` — sign-in and future account flows
- `checkout` — ticket selection, attendee details, payment choices, and order summary
- `events` — event cards, artwork, filtering, catalog, and detail views
- `home` — landing-page sections composed from shared UI and event components

Route files under `src/app` should remain thin: load route data, handle framework concerns such as metadata and `notFound`, then compose feature components.

Generic primitives belong in `src/components/ui`. Site-wide chrome and brand elements belong in `src/components/site`. Domain components should not be moved into either shared directory until they are genuinely useful across features.
