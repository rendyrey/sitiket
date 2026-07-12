# Stack Inventory

Versions below come from `package.json`. A dependency being installed does not necessarily mean the application has configured it.

## Platform and build

| Technology | Version | Status | Role |
| --- | ---: | --- | --- |
| Next.js | 15.2.4 | Active | App Router, server/client rendering, routing, metadata, image and font optimization, API handlers |
| React / React DOM | 19.0.0 | Active | Component runtime |
| TypeScript | 5.8.2 | Active | Strict static typing with no emitted output |
| pnpm | Not pinned | Active | Dependency management through `pnpm-lock.yaml` |
| Webpack bundle analyzer | 15.2.4 | Available | Enabled by running a build with `ANALYZE=true` |
| Sharp | 0.33.5 | Available | Next.js production image optimization |

The project contains `pnpm-workspace.yaml` only for pnpm configuration; it has no package globs and remains a non-monorepo application.

## Presentation

| Technology | Version | Status | Role |
| --- | ---: | --- | --- |
| Tailwind CSS | 3.4.17 | Active | Utility styling and responsive layout |
| RizzUI | 1.0.1 | Active | Primary dashboard component foundation |
| Headless UI | 2.2.0 | Active | Accessible unstyled interaction primitives |
| Floating UI | 0.27.5 | Active | Popover and floating-element positioning |
| next-themes | 0.4.6 | Active | Theme selection and hydration-safe dark mode |
| React Icons | 5.5.0 | Active | General icon set; the core also includes local SVG icons |
| SimpleBar React | 3.3.0 | Active | Styled scroll containers |
| Motion | 12.5.0 | Available | Animation primitives |
| Swiper | 11.2.6 | Active in core | Carousel behavior |

Class composition uses `clsx`, `tailwind-merge`, and local `cn`/`classNames` helpers.

## State, forms, and validation

| Technology | Version | Status | Role |
| --- | ---: | --- | --- |
| Jotai | 2.12.2 | Active | Global atoms for drawers, modals, calendars, image viewer, layout, and query state |
| React Hook Form | 7.54.2 | Active in core | Form state and field registration |
| Zod | 3.24.2 | Active in core | Runtime schemas and inferred form types |
| Hook Form resolvers | 4.1.3 | Active in core | Zod integration for React Hook Form |
| React Use / ahooks | 17.6.0 / 3.x | Active in core | Reusable browser and interaction hooks |

## Structured UI and visualization

| Technology | Version | Status | Role |
| --- | ---: | --- | --- |
| TanStack Table | 8.21.2 | Active in core | Headless typed table state |
| rc-table | 7.50.4 | Active in core | Legacy and presentation-focused tables |
| Recharts | 2.15.1 | Active in core | Dashboard charts |
| dnd-kit | 6.x / 10.x | Active in core | Sortable and draggable UI |
| Google Maps loader | 1.16.8 | Active in core | Google Maps JavaScript API loading |
| React Big Calendar | 1.18.0 | Available | Calendar views |

## Content, files, and communication

| Technology | Status | Role |
| --- | --- | --- |
| UploadThing | Active, placeholder auth | `/api/uploadthing` route plus reusable upload controls |
| React Dropzone | Active in core | Local file selection and drop areas |
| React Email packages | Available | Email component rendering primitives |
| Resend | Available | Email delivery client; no active application flow |
| Nodemailer | Available | SMTP delivery; no active application flow |
| NextAuth v4 | Available | Authentication dependency; no active auth route/configuration |

## Quality tooling

| Tool | Configuration |
| --- | --- |
| TypeScript | `strict`, `isolatedModules`, bundler module resolution, `noEmit` |
| ESLint | Extends `next/core-web-vitals` |
| Prettier | Includes Tailwind class sorting plugin |
| Tests | No unit, integration, or end-to-end runner is configured currently |

