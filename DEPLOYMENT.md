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
- `EMAIL_CONFIG_SECRET` — key for encrypting organizer SMTP passwords at rest
  (≥16 chars; falls back to deriving from `JWT_SECRET` when unset, but set it
  explicitly in production).
- `SMTP_*` — the **platform** sender, used only for platform emails (admin
  application notifications) and as a legacy fallback; buyer-facing emails ride
  each organizer's own SMTP config (see BACKEND.md).

## Deploying a change

```bash
ssh ubuntu@43.157.226.204
cd /var/www/sitiket
git pull

# Backend
cd backend
npm ci                 # only when package-lock.json changed
npm run db:migrate
pm2 restart sitiket-backend

# Frontend
cd ..
pnpm install           # only when pnpm-lock.yaml changed
pnpm build             # NEXT_PUBLIC_* values are baked in here
pm2 restart sitiket-app
```

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

## Uploads

`backend/uploads/` on the VPS disk holds all user uploads (event images,
payment proofs, QRIS codes). It is not in git — back it up alongside the
database. Swapping to object storage (GCS/S3) is a known follow-up (BACKEND.md).
