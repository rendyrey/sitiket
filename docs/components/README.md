# Component Library Guide

This directory is the discovery entry point for humans and coding agents using the Isomorphic component library in this non-monorepo application.

## Start here

1. Open [Component Catalog](./INDEX.md) to choose a category.
2. Search the category reference by UI concept, export name, props type, or import path.
3. Open the linked source file for the exact public API and examples in its JSX.
4. Check [Supporting APIs](./SUPPORTING_APIS.md) for required hooks, providers, types, and helpers.

## Import convention

Reusable Isomorphic modules live under `src/core` and use the `@core/*` alias:

```tsx
import WidgetCard from '@core/components/cards/widget-card';
import { DatePicker } from '@core/ui/datepicker';
import { useMedia } from '@core/hooks/use-media';
```

Starter-specific modules remain under `src/components` and use `@/components/*`.

## Providers and client components

Reference tables identify modules containing a `use client` directive. Render them from a client boundary when required. Components using cart actions need `CartProvider` from `@core/providers/cart-provider`. Modal and drawer components need their matching container/provider modules under `@core/modal-views` and `@core/drawer-views`.

## Assets and uploads

The flight booking card's bundled map image is at `public/map.webp`. Upload UI is connected to the local UploadThing router at `src/app/api/uploadthing`.

## Keep references current

After adding, moving, or deleting components, regenerate every reference file:

```bash
pnpm docs:components
```

The generated reference files should not be edited by hand; update component source or this generator instead.
