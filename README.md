<p align="center">
  <img src="public/images/splash.png" alt="KegelNetzwerk" width="420">
</p>

<p align="center">
  <a href="https://sonarcloud.io/summary/new_code?id=KegelNetzwerk_kegelnetzwerk-web">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=KegelNetzwerk_kegelnetzwerk-web&metric=alert_status" alt="Quality Gate Status">
  </a>
  <a href="https://sonarcloud.io/component_measures?id=KegelNetzwerk_kegelnetzwerk-web&metric=coverage">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=KegelNetzwerk_kegelnetzwerk-web&metric=coverage" alt="Coverage">
  </a>
  <a href="https://github.com/KegelNetzwerk/kegelnetzwerk-web/actions/workflows/build.yml">
    <img src="https://github.com/KegelNetzwerk/kegelnetzwerk-web/actions/workflows/build.yml/badge.svg" alt="Build">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white" alt="Node.js">
</p>

---

Multi-tenant web platform for managing German bowling clubs (Kegelklubs). Each club gets its own isolated space within a shared database. Features include news, voting/polls, events with RSVP, points & penalties scoring, member management, club settings with custom theming, Secret Santa, and a mobile app API.

---

## Prerequisites

| Tool | Min. version | Check |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10 | `npm --version` |
| Git | 2.x | `git --version` |
| PostgreSQL | 15 or 16 | `psql --version` |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

Open a PostgreSQL prompt and create a database for the app:

```sql
CREATE DATABASE kegelnetzwerk;
```

If you need a dedicated user:

```sql
CREATE USER knuser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE kegelnetzwerk TO knuser;
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://knuser:yourpassword@localhost:5432/kegelnetzwerk"

# Random secret for session signing — generate with: openssl rand -hex 32
BETTER_AUTH_SECRET="your-random-secret-here"

BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (optional — used for password reset and member invite emails)
EMAIL_FROM="noreply@yourdomain.de"
EMAIL_HOST="smtp.yourdomain.de"
EMAIL_PORT="587"
EMAIL_USER="your-smtp-user"
EMAIL_PASS="your-smtp-password"
```

### 4. Run database migrations

This creates all tables in your PostgreSQL database.

**Development:**
```bash
npx prisma migrate dev
```

**Production** (the DB user typically lacks permission to create a shadow database):
```bash
npx prisma migrate deploy
```

### 4b. Generate the Prisma client

If you see `Cannot find module '.prisma/client/default'` when seeding or starting the app, generate the client manually:

```bash
npx prisma generate
```

This is normally done automatically by `prisma migrate dev`, but may need to be run explicitly after `prisma migrate deploy` or a fresh `npm install`.

### 5. Seed a registration code

The registration page requires an invite code. Seed one into the database:

```bash
npm run db:seed
```

This inserts the code **`kegel2026`** into the `RegistrationCode` table. You can change the code by editing `prisma/seed.ts` before running the command.

> The seed command is configured in `prisma.config.ts` (`migrations.seed`).
> To use a different code, edit the `REGISTRATION_CODE` constant in `prisma/seed.ts` before seeding.
>
> Alternatively, insert a code directly via SQL:
> ```sql
> INSERT INTO "RegistrationCode" (code, "createdAt")
> VALUES (encode(sha256('your-secret-code'), 'hex'), now());
> ```

---

## First login

### Step 1 — Register your club

Open [http://localhost:3000/register](http://localhost:3000/register) and fill in:

| Field | Example |
|---|---|
| Club name | `Kegelclub Beispiel` |
| Your nickname | `Admin` |
| Email | `admin@example.com` |
| Password | (choose one, min. 4 characters) |
| Invite code | `kegel2026` |

This creates the club and your first **Admin** account.

### Step 2 — Sign in

Go to [http://localhost:3000/login](http://localhost:3000/login) and enter:

- **Club name:** the exact name you registered with
- **Nickname:** the nickname you chose
- **Password:** your password

---

## Development

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run start      # Start production server
npm test           # Run unit tests
npm run test:coverage  # Run tests with coverage report
```

### Database helpers

```bash
npm run db:migrate          # Create a new migration after schema changes
npm run db:push             # Push schema changes without a migration file (dev only)
npm run db:studio           # Open Prisma Studio (database GUI) at http://localhost:5555
npm run db:seed             # Re-run the seed script
npm run db:migrate-legacy   # Migrate data from the legacy PHP/MySQL database (see below)
```

### Adding more registration codes

To allow another club to register, insert an additional code via Prisma Studio or SQL:

```sql
INSERT INTO "RegistrationCode" (code, "createdAt")
VALUES (encode(sha256('another-secret-code'), 'hex'), now());
```

---

## Migrating data from the legacy PHP application

See **[docs/migration.md](docs/migration.md)** for the full guide, including what is migrated, password handling, and how to run the script.

```bash
npm run db:migrate-legacy
```

---

## Mobile App API

The following endpoints are available for the Android companion app. All requests (except `/api/app/login`) require a `Authorization: Bearer <token>` header. The token is returned by the login endpoint.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/app/login` | Authenticate; returns session token |
| `GET` | `/api/app/members` | List all club members |
| `GET` | `/api/app/clubs` | Club info |
| `POST` | `/api/app/upload-results` | Bulk upload game results (JSON array) |
| `POST` | `/api/app/upload-photo` | Upload a photo (multipart/form-data) |
| `GET` | `/api/app/version` | App version check |

**Login request body:**
```json
{
  "clubName": "Kegelclub Beispiel",
  "nickname": "Admin",
  "password": "yourpassword"
}
```

---

## Project structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (app)/          # Authenticated pages (news, votes, events, …)
│   │   │   └── admin/      # Admin-only pages (members, settings, games)
│   │   └── (auth)/         # Login, register, password reset
│   └── api/                # API route handlers
├── components/
│   ├── layout/             # AppShell, Header, Sidebar, MainNav
│   ├── ui/                 # shadcn/ui components
│   ├── Comments.tsx
│   └── RichTextEditor.tsx
├── i18n/                   # next-intl routing + request config
└── lib/                    # prisma, auth, email, theme, upload helpers
messages/
├── de.json                 # German UI strings (default locale)
└── en.json                 # English UI strings
prisma/
├── schema.prisma           # Full database schema
├── migrations/             # Migration history
└── seed.ts                 # Registration code seeder
scripts/
└── migrate.ts              # Legacy PHP/MySQL → PostgreSQL data migration
docs/
└── migration.md            # Migration guide
```
