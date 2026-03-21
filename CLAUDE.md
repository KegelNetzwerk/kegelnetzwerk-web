# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Locations

- **Webservice** (this project): `E:\2026_Projects\kegelnetzwerk-web`
- **App**: `E:\2026_Projects\kegelnetzwerk-app`

## Project Overview

KegelNetzwerk Web is a Next.js 16 App Router multi-tenant web application for managing German bowling clubs (Kegelklubs). It handles members, news, votes, events, scoring (games & penalties), a Secret Santa feature, and club administration.

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL via Prisma ORM
- **i18n**: next-intl (locales: `de`, `en`; default: `de`; locale is part of the URL)
- **Auth**: Cookie-based sessions (`getCurrentMember()` from `@/lib/auth`)
- **Font**: DM Sans via `next/font/google`

## UI Conventions

### User Feedback — always use Toaster

All user-facing feedback (success, error, info) **must** be delivered via the `toast()` function from `sonner`:

```ts
import { toast } from 'sonner';

toast.success(t('successMessage'));
toast.error(t('errorMessage'));
```

The `<Toaster>` is mounted globally in `src/app/[locale]/layout.tsx` with `richColors` and `position="top-center"`. **Never use inline status messages, alert dialogs, or custom feedback UI** — always use the toaster.

### Collapsible sections

Collapsible toggle buttons must always include `cursor-pointer` in their className.

### Forms

- Input fields inside gray/muted panels should have `bg-white` so they stand out.
- Language switching is done by navigating to the same path with a different locale prefix (no DB storage needed).

## Architecture Notes

- **Multi-tenant**: all clubs share one DB, separated by `clubId`. Always filter by `member.clubId`.
- **Server components** fetch data and pass serialized props to client components. Dates must be `.toISOString()`-serialized before passing to clients.
- **Locale** in `AppShell` must be read via `getLocale()` from `next-intl/server` — never hardcoded.
- **Filters in URL**: the scoring page stores all filter state as URL search params (`useSearchParams` / `router.replace`).
- **Prisma migrations**: use `prisma migrate dev` for schema changes; if non-interactive, write the SQL manually and apply with `prisma migrate deploy`.
