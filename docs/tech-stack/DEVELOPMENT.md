# Development Workflow

## Setup

pnpm is the intended package manager because the repository commits `pnpm-lock.yaml` and `pnpm-workspace.yaml`.

```bash
pnpm install
pnpm dev
```

The development server defaults to `http://localhost:3000`; Next.js selects another port if it is occupied.

No Node version file or `packageManager` field is committed, so contributors should use a Node release supported by Next.js 15 and keep local versions consistent in their team or deployment environment.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Create and validate a production build |
| `pnpm start` | Serve the production build |
| `pnpm type:check` | Run strict TypeScript checking without emitting files |
| `pnpm lint` | Run the configured Next.js/ESLint lint command |
| `pnpm format` | Format the repository and sort Tailwind classes |
| `pnpm docs:components` | Regenerate the component catalog |
| `ANALYZE=true pnpm build` | Build with the bundle analyzer enabled |
| `pnpm clean` | Remove `.next` and `node_modules` |

## Environment variables

Variables referenced directly by repository code or configuration:

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAP_API_KEY` | Browser-visible | Google Maps component API key |
| `ANALYZE` | Build-time | Enables bundle analysis when set to `true` |

The committed `.env` is empty. Use `.env.local` for developer-specific values; it is ignored by Git. UploadThing and any future auth/email integrations also require provider credentials, but this repository does not currently define a validated environment schema for them.

## Adding a page

1. Add a route directory and `page.tsx` under `src/app`.
2. Keep the page as a Server Component when possible.
3. Search `docs/components/INDEX.md` for reusable UI.
4. Extract interactive sections into focused client components.
5. Add route constants to `src/config/routes.ts` when navigation needs them.
6. Verify responsive behavior inside the Hydrogen layout.

## Adding a reusable component

- Put low-level primitives in `src/core/ui`.
- Put composed reusable widgets in the appropriate `src/core/components` category.
- Put application-specific wrappers in `src/components` or beside their route.
- Export explicit props types where useful.
- Run `pnpm docs:components` so AI and human references remain current.

## Definition of done

At minimum, run:

```bash
pnpm docs:components
pnpm type:check
pnpm build
```

Also exercise affected routes and interactions in a browser. This repository does not currently configure automated tests; important business behavior should gain a test framework as it is introduced rather than relying only on build checks.

## Production checklist

- Replace UploadThing's fake authentication middleware.
- Configure and validate environment variables.
- Set application metadata and Open Graph values for the deployed product.
- Confirm remote image hosts if external Next Image sources are introduced.
- Add automated tests for critical flows.
- Review dependency security and upgrade notices before deployment.

