# KegelNetzwerk

Multi-tenant web platform for managing German bowling clubs (Kegelklubs). Each club gets its own isolated space within a shared database. Features include news, voting/polls, events with RSVP, points & penalties scoring, member management, club settings with custom theming, Secret Santa, and a mobile app API.

**Stack:** Next.js 16 (App Router, TypeScript) · PostgreSQL · Prisma · Tailwind CSS · shadcn/ui · next-intl (de/en)

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

This creates all tables in your PostgreSQL database:

```bash
npx prisma migrate dev
```

### 5. Seed a registration code

The registration page requires an invite code. Seed one into the database:

```bash
npm run db:seed
```

This inserts the code **`kegel2026`** into the `RegistrationCode` table. You can change the code by editing `prisma/seed.ts` before running the command.

> To insert a custom code manually via SQL instead:
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
```

### Database helpers

```bash
npm run db:migrate  # Create a new migration after schema changes
npm run db:push     # Push schema changes without a migration file (dev only)
npm run db:studio   # Open Prisma Studio (database GUI) at http://localhost:5555
npm run db:seed     # Re-run the seed script
```

### Adding more registration codes

To allow another club to register, insert an additional code via Prisma Studio or SQL:

```sql
INSERT INTO "RegistrationCode" (code, "createdAt")
VALUES (encode(sha256('another-secret-code'), 'hex'), now());
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
```
