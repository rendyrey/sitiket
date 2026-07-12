# UI and Component System

## Design foundation

RizzUI is the primary component foundation. Tailwind CSS provides composition, spacing, responsive behavior, and state variants. Headless UI and Floating UI support interaction patterns that need unstyled behavior or floating positioning.

Tailwind scans both `src/**/*` and the distributed RizzUI files. Do not remove the RizzUI content path from `tailwind.config.ts`, or library classes may be missing from production CSS.

## Theme tokens

Colors are CSS variables declared in `src/app/globals.css` and consumed through Tailwind names:

- Neutral scale: `gray-0` through `gray-1000`
- Semantic surfaces: `background`, `foreground`, `muted`, `muted-foreground`
- Brand colors: `primary-*` and `secondary-*`
- Status colors: `red-*`, `orange-*`, `blue-*`, and `green-*`

Light values live under `:root`; dark values override them under `[data-theme="dark"]`. Prefer classes such as `bg-gray-0`, `text-gray-900`, and `border-primary` over literal hex values.

The active theme provider disables system-theme detection and starts from `siteConfig.mode`.

## Typography and responsive layout

Inter is the body font and Lexend Deca is used for headings. Both load through `next/font` in `src/app/fonts.ts` and expose CSS variables through the root layout.

The breakpoint set extends Tailwind with:

| Name | Width |
| --- | ---: |
| `xs` | 480px |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |
| `3xl` | 1920px |
| `4xl` | 2560px |

The Hydrogen layout becomes a fixed-sidebar dashboard at `xl` and above.

## Component discovery

Start at the [component catalog](../components/INDEX.md). It indexes 366 component modules across UI primitives, cards, charts, tables, maps, drag-and-drop, invoice tools, search, media, feedback, and icons.

Typical imports:

```tsx
import WidgetCard from '@core/components/cards/widget-card';
import { DatePicker } from '@core/ui/datepicker';
import SimpleBar from '@core/ui/simplebar';
```

After changing component files, update the generated references:

```bash
pnpm docs:components
```

## Overlay architecture

Modals and drawers use Jotai-backed global state. Their containers are rendered once in the root layout, so feature code can call the matching hooks without manually mounting a portal for every screen.

When building a new UI:

1. Search the catalog by concept and props type.
2. Prefer composition of existing primitives.
3. Reuse semantic tokens and responsive breakpoints.
4. Mark the component as client-only only when interaction requires it.
5. Keep domain-specific wrappers outside low-level `src/core/ui`.

