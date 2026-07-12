# Application Architecture

## Rendering and routing

The application uses the Next.js App Router under `src/app`. Files are Server Components unless they declare `use client`. Interactive core modules commonly use client boundaries for Jotai atoms, form state, browser APIs, or event handlers.

Current routes:

| Route | Source | Rendering |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Static page inside the dashboard shell |
| `/api/uploadthing` | `src/app/api/uploadthing/route.ts` | Dynamic GET/POST API handler |

## Root composition

`src/app/layout.tsx` composes the application in this order:

```text
HTML and Google font variables
└── next-themes ThemeProvider
    ├── Next.js route progress indicator
    └── Jotai Provider
        ├── Hydrogen dashboard layout
        │   ├── Sidebar
        │   ├── Header
        │   └── Route content
        ├── Global drawer container
        └── Global modal container
```

The application-level provider in `src/app/shared/theme-provider.tsx` is the provider currently mounted by the root layout. `src/core/providers` contains a portable equivalent for consumers that want to compose the reusable core independently.

## Directory ownership

| Path | Responsibility |
| --- | --- |
| `src/app` | Routes, root layout, global CSS, API route handlers |
| `src/app/shared` | Application-level modal, drawer, and provider wiring |
| `src/layouts` | Dashboard chrome such as sidebar, header, menus, and profile controls |
| `src/components` | Starter-specific components |
| `src/core/components` | Reusable cards, charts, tables, DnD, maps, search, icons, and complex components |
| `src/core/ui` | Lower-level reusable UI primitives |
| `src/core/hooks` | Reusable state and browser hooks |
| `src/core/providers` | Portable provider composition and cart context |
| `src/core/types` | Shared domain and component types |
| `src/core/utils` | Formatting, filtering, class composition, CSV, theme, and upload helpers |
| `src/config` | Routes, site metadata, themes, constants, and enums |
| `public` | Static assets served from the application root |
| `docs/components` | Generated component discovery catalog |

## Import aliases

Aliases are configured in `tsconfig.json`:

```tsx
import HydrogenLayout from '@/layouts/hydrogen/layout';
import WidgetCard from '@core/components/cards/widget-card';
import { useMedia } from '@core/hooks/use-media';
```

- `@/*` resolves to `src/*`.
- `@core/*` resolves to `src/core/*`.

Use relative imports only for tightly coupled files in the same component folder.

## Boundary guidance

- Keep route-specific data fetching and mutations in `src/app`.
- Keep reusable presentational and interaction logic in `src/core`.
- Do not make core modules depend on a specific page route.
- Pass server-fetched data into interactive client components through serializable props.
- Place globally shared client state behind the existing Jotai provider rather than introducing another global store without a demonstrated need.

