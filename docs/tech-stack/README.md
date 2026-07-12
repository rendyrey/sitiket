# Tech Stack Documentation

> AI entry point: read this file first, then open the topic document relevant to the task.

This repository is a standalone Next.js dashboard starter containing the reusable Isomorphic component library. It is intentionally not coupled to the original monorepo.

## Quick facts

| Area | Choice |
| --- | --- |
| Application | Next.js 15.2 App Router |
| UI runtime | React 19 |
| Language | TypeScript 5.8 in strict mode |
| Styling | Tailwind CSS 3.4, PostCSS, CSS variables |
| UI foundation | RizzUI 1.0 plus Headless UI and Floating UI |
| State | Jotai and local React context |
| Theme | next-themes with light/dark design tokens |
| Forms | React Hook Form, Zod, Hook Form resolvers |
| Data tables | TanStack Table and rc-table |
| Charts | Recharts |
| Uploads | UploadThing App Router handler |
| Package manager | pnpm lockfile and workspace configuration |

## Documentation map

- [Stack inventory](./STACK.md) — packages grouped by responsibility and whether they are active.
- [Application architecture](./ARCHITECTURE.md) — rendering model, providers, aliases, and directory ownership.
- [UI and component system](./UI_AND_COMPONENTS.md) — design tokens, styling conventions, component discovery, and layout.
- [State, data, and integrations](./STATE_DATA_AND_INTEGRATIONS.md) — state patterns, forms, tables, uploads, maps, email, and authentication status.
- [Development workflow](./DEVELOPMENT.md) — commands, environment variables, quality checks, and implementation recipes.
- [Component catalog](../components/INDEX.md) — generated index of every reusable component module.

## Status vocabulary

- **Active** means the repository imports and configures the technology now.
- **Available** means the dependency is installed for template components but no application-level flow is configured yet.
- **Placeholder** means code exists but must be secured or completed before production.

## Core engineering constraints

1. Prefer `@core/*` for reusable library code and `@/*` for application code.
2. Server Components are the default; add `use client` only when browser APIs, state, effects, or event handlers require it.
3. Use existing CSS-variable color tokens instead of hardcoded theme colors.
4. Search the component catalog before creating a new component.
5. Regenerate component references with `pnpm docs:components` after component changes.

