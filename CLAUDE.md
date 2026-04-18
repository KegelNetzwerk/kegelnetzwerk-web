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

## Language

All English-language strings (i18n, code comments, documentation) must use **American English** (e.g. "color" not "colour", "center" not "centre").

## German Terminology

Use **"Klub"** (not "Verein") for the concept of a bowling club throughout all German UI strings and code. For example: "Klubprofil" not "Vereinsprofil".

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

## Code Quality (SonarQube)

The SonarQube Cloud quality gate is enforced on every push. Avoid introducing these patterns:

- **S3923** — never write a ternary where both branches return the same value; simplify to a single expression.
- **S6772** — always wrap bare text that is a sibling of a JSX element in a `<span>`; e.g. `<label><input /><span>Label text</span></label>`.
- **S7781** — use `replaceAll(/pattern/g, ...)` instead of `.replace(/pattern/g, ...)` for global regex replacements.
- **S5852** (ReDoS) — avoid complex nested-quantifier regexes on untrusted strings; use the `stripHtml()` helper from `@/lib/strip-html` instead of inline `/<[^>]+>/g`.
- **S2871** — always pass a comparator to `.sort()` on string arrays: `.sort((a, b) => a.localeCompare(b))`.

The shadcn `src/components/ui/label.tsx` uses `// NOSONAR` to suppress S6853 (label association). Do not remove this comment or restructure the component — `htmlFor` is intentionally passed via props spread at every usage site.

## Pre-commit Hook (SonarQube Secrets)

A global SonarQube Secrets CLI hook (`~/.sonar/sonarqube-cli/hooks/pre-commit`) scans every staged file for hardcoded secrets. **`messages/de.json` and `messages/en.json` trigger false positives** because German/English UI strings contain words like "Passwort" / "Password".

The hook has no exclusion mechanism. To avoid a blocked commit:
- When fixing a bug that would otherwise require adding a new i18n key (e.g. to differentiate two toast messages), prefer simplifying the code to avoid the new key rather than modifying the messages files unnecessarily.
- If a messages file change is genuinely needed, stage and commit it alone after verifying no other false positives are present.
