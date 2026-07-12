# State, Data, and Integrations

## State model

The application uses three state scopes:

| Scope | Preferred mechanism | Examples |
| --- | --- | --- |
| Component-local | React state/reducer | Input state, toggles, isolated interaction |
| Cross-component client state | Jotai | Modal, drawer, calendar, image viewer, layout, query state |
| Feature context | React context | Portable cart provider |

The root Jotai provider is mounted in `src/app/layout.tsx`. Avoid storing server-derived data globally when it can stay in a Server Component or be passed as props.

## Forms and validation

React Hook Form manages form state. Zod schemas validate data, and `@hookform/resolvers/zod` connects the two. The reusable form wrapper is `@core/ui/form`; the invoice builder is a concrete implementation example.

Recommended sequence:

1. Define a Zod schema.
2. Infer the TypeScript input type from the schema.
3. Initialize React Hook Form with `zodResolver`.
4. Use RizzUI fields and display schema errors near their fields.
5. Submit through a route handler or server action owned by the application layer.

## Tables and charts

TanStack Table provides typed headless table state, while the reusable table modules add pagination, selection, pinning, resizing, sorting, and drag-and-drop. A local module augmentation at `src/types/react-table.d.ts` adds repository-specific metadata.

Recharts is used for dashboard visualization. Shared chart cards and tooltip/tick helpers live under `src/core/components/charts` and `src/core/components/cards`.

## UploadThing

UploadThing is active at `/api/uploadthing` with two routes:

- `avatar`: one image up to 4 MB.
- `generalMedia`: up to four PDFs, four images, or one video with the limits defined in `src/app/api/uploadthing/core.ts`.

The current middleware returns a fake user ID. This is **placeholder authentication and is not production-safe**. Replace it with verified session/user logic before exposing uploads publicly.

Reusable clients are exported from `@core/utils/uploadthing`, and upload UI lives under `@core/ui/file-upload`.

## Google Maps

Map components read `NEXT_PUBLIC_GOOGLE_MAP_API_KEY` directly in the browser. Configure the key in an ignored local environment file and restrict it by origin and API in Google Cloud.

## Authentication and email

NextAuth, React Email, Resend, and Nodemailer are installed but not wired into active application routes or server actions in this starter. Treat them as available building blocks, not functioning features.

Before implementing these capabilities:

- Add validated server-only environment variables.
- Keep secrets out of `NEXT_PUBLIC_*` variables.
- Add real authorization checks to every sensitive route handler.
- Create explicit error handling and delivery/audit logging appropriate to the application.

## Other available capabilities

The core includes adapters or components for calendars, rich-text editing, phone input, QR codes, ratings, media playback, CSV export, printing, carousels, countdowns, maps, zoom/pan, and file dropzones. Consult the component catalog before adding another library.

