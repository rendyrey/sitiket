# Deployment reference

SiTIKET runs on a single Ubuntu VPS — no Vercel, no containers in production.

## Topology

| Piece | Where |
| --- | --- |
| VPS | `ubuntu@43.157.226.204` (Tencent Cloud, hostname `VM-6-192-ubuntu`) |
| App checkout | `/var/www/sitiket` (git clone of `git@github.com:rendyrey/sitiket`) |
| Frontend | Next.js standalone via pm2 app **`sitiket-app`** (`pnpm start`, port 3000) |
| Backend | Express via pm2 app **`sitiket-backend`** (cwd `/var/www/sitiket/backend`, port 4000) |
| Database | MySQL 8 on the VPS |
| Reverse proxy | nginx, site config `/etc/nginx/sites-available/sitiket` |
| TLS | certbot (Let's Encrypt), auto-renew |
| Domains | **sitiket.com** / **www.sitiket.com** (primary), `sitiket.rendy.link` (legacy, kept alive) |

DNS is managed at the domain registrar (Hostinger for sitiket.com). Both apex and
`www` must be **A records to 43.157.226.204** — certbot's HTTP-01 challenge and
the site itself break if they point anywhere else.

## nginx routing

Only two upstream paths exist (see the site config for the full picture):

- `/uploads/` → backend :4000 — the ONLY backend path the browser hits directly
  (event images, payment proofs, QRIS codes).
- everything else → frontend :3000, **including `/api/auth/*`** (Next.js BFF
  routes that set the httpOnly session cookie). Never proxy `/api/` to the
  backend — server-to-server calls go straight to `127.0.0.1:4000` via
  `API_BASE_URL`, not through nginx.

## Environment (production values that differ from dev)

Frontend `/var/www/sitiket/.env`:

- `API_BASE_URL=http://127.0.0.1:4000` — internal, never the public domain.
- `NEXT_PUBLIC_API_ORIGIN=https://sitiket.com` — public origin the **browser**
  loads `/uploads` assets from. Inlined at **build time** (it also derives the
  next/image allowlist in `next.config.js`), so changing it requires a rebuild.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — the domain must also be listed under
  *Authorized JavaScript origins* for this OAuth client in Google Cloud Console,
  or Google Sign-In will refuse the new domain.

Backend `/var/www/sitiket/backend/.env`:

- `FRONTEND_URL=https://sitiket.com` — CORS origin + the base for links in
  buyer emails.
- `GOOGLE_CLIENT_SECRET` — required for the organizer "Connect Gmail" flow
  (OAuth code exchange). Same OAuth client as `GOOGLE_CLIENT_ID`.
- `EMAIL_CONFIG_SECRET` — key for encrypting organizer SMTP passwords at rest
  (≥16 chars; falls back to deriving from `JWT_SECRET` when unset, but set it
  explicitly in production).
- `EMBEDDINGS_BASE_URL` / `EMBEDDINGS_API_KEY` / `EMBEDDINGS_MODEL` — optional
  trio enabling semantic merch search through any OpenAI-compatible
  `/embeddings` endpoint; production uses `https://api.openai.com/v1` with
  `text-embedding-3-large` (NOT `-small` — its Indonesian↔English alignment
  is too weak: "kaos" scored below unrelated words against an English product
  name). `VOYAGE_API_KEY` is the single-var alternative (Voyage AI); the trio
  wins when both are set. `EMBEDDINGS_MIN_SIMILARITY` optionally overrides the
  per-provider cosine cutoff (defaults: 0.45 Voyage, 0.2 OpenAI-compatible).
  Unset, merch search stays keyword-only (FULLTEXT + fuzzy) — nothing breaks.
  The backend must be restarted (`--update-env`, with the nvm PATH exported)
  after changing these; a model change re-embeds all products automatically.
- `SMTP_*` — the **platform** sender, used only for platform emails (admin
  application notifications) and as a legacy fallback; buyer-facing emails ride
  each organizer's own SMTP config (see BACKEND.md).

## Deploying a change

```bash
ssh ubuntu@43.157.226.204
export PATH="/home/ubuntu/.nvm/versions/node/v24.18.0/bin:$PATH"  # required — see below
cd /var/www/sitiket
git pull --ff-only

# Backend — no build step
cd backend
npm ci                 # only when package-lock.json changed
npm run db:migrate     # only when migrations changed
cd ..

# Frontend
pnpm install           # only when pnpm-lock.yaml changed
pnpm build             # NEXT_PUBLIC_* values are baked in here

pm2 restart sitiket-app sitiket-backend --update-env && pm2 save
```

`pnpm`/`node` live in nvm (`/home/ubuntu/.nvm/versions/node/<version>/bin`) and
are **not** on the PATH of a non-interactive `ssh host 'cmd'` shell. Export it
before any `pnpm`/`pm2` command, and use `set -eo pipefail` so a
`pnpm: command not found` can't hide behind a pipe to `tail`:

```bash
export PATH="/home/ubuntu/.nvm/versions/node/v24.18.0/bin:$PATH"
```

Both apps are launched by pm2 as `pnpm start`, so their saved PATH points into
nvm. Running `pm2 restart <app> --update-env` from a shell *without* that PATH
overwrites the saved one and the app crash-loops with no stack trace — it simply
cannot find node. Always `--update-env` from a shell with nvm exported, then
`pm2 save`.

**Config-only change** (editing a value in `backend/.env`, e.g.
`ORDER_PAYMENT_HOLD_MINUTES`): no pull or build needed, but the value is read at
boot — `pm2 restart sitiket-backend --update-env && pm2 save`, PATH exported as
above. Back the file up first and diff the key count to prove only the intended
line moved.

Smoke checks: `curl -s localhost:4000/api/health`, then load the landing page
and an event page over the public domain (verifies nginx, the session BFF, and
that `/uploads` images render).

## TLS / adding a domain

```bash
# after the DNS A record points at this VPS:
sudo certbot --nginx -d sitiket.com -d www.sitiket.com --redirect
```

Certbot rewrites the nginx site config in place (adds the 443 blocks +
HTTP→HTTPS redirects) and installs auto-renewal. The legacy
`sitiket.rendy.link` cert renews independently.

## Google OAuth (sign-in + Connect Gmail)

One Google Cloud OAuth client serves both Google Sign-In and the organizer
"Connect Gmail" email flow. Console requirements (Google Cloud Console →
APIs & Services → Credentials / OAuth consent screen):

- **Authorized JavaScript origins**: every origin the sign-in button runs on —
  `https://sitiket.com`, plus `http://localhost:3000` for dev.
- **Authorized redirect URIs** (Connect Gmail):
  `https://sitiket.com/api/auth/google-mail/callback`, plus
  `http://localhost:3000/api/auth/google-mail/callback` for dev.
- **Consent screen scopes**: add `.../auth/gmail.send` ("Send email on your
  behalf"). It is a *sensitive* scope — while the app is unverified, organizers
  see Google's "unverified app" warning and must click *Advanced → continue*,
  and Google caps grants at 100 users. Submitting the app for brand
  verification removes the warning.
- **Publishing status must be "In production"**, not "Testing" — in Testing
  mode Google expires refresh tokens after 7 days, which would silently break
  organizer email until they reconnect.

## Uploads

`backend/uploads/` on the VPS disk holds all user uploads (event images,
payment proofs, QRIS codes). It is not in git — back it up alongside the
database. Swapping to object storage (GCS/S3) is a known follow-up (BACKEND.md).

### Upload size limits — keep all three in sync

An image upload crosses three independent size gates. It fails at whichever is
smallest, so changing one alone does nothing. All three are currently **50 MB**:

| Gate | Where | Default if unset |
| --- | --- | --- |
| nginx `client_max_body_size` | `/etc/nginx/sites-available/sitiket` (both server blocks) | 1 MB |
| Next.js Server Action `bodySizeLimit` | `next.config.js` → `experimental.serverActions` | **1 MB** |
| multer `MAX_IMAGE_BYTES` | `backend/src/middleware/upload.js` | — |

The Next.js one is the easy one to miss: every upload form posts through a
Server Action, so its 1 MB default silently capped uploads even while nginx and
multer allowed far more. Symptom was a permanently stuck "Uploading…" button.

Poster images are additionally validated against an exact resolution allow-list
(1080x1080, 1080x1350, 1080x1920) in `backend/src/services/event-image-service.js`.
