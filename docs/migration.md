# Migrating data from the legacy PHP application

If you are upgrading from the original PHP/MySQL version of KegelNetzwerk, a migration script is provided that reads the MySQL dump file and imports all data into the PostgreSQL database.

## Prerequisites

- The new PostgreSQL database must already be set up and all Prisma migrations applied (`npx prisma migrate deploy`).
- A MySQL dump file of the legacy database (e.g. exported with `mysqldump`).
- The legacy uploads directory (member avatars, news images, etc.) available on the local filesystem.

## Running the migration

The script is **idempotent** — it uses upsert for every record and can be run multiple times safely without creating duplicates. Clearing the database first is optional but recommended for a clean initial import:

```bash
npx prisma migrate reset --force
```

Then run the migration script:

```bash
npm run db:migrate-legacy
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DUMP_PATH` | `E:\2026_Projects\kegelnetzwerk\Database\dump-kegelnetzwerk1-202603141411.sql` | Path to the MySQL dump file |
| `LEGACY_UPLOADS_DIR` | `E:\2026_Projects\kegelnetzwerk\uploads` | Path to the legacy uploads directory (avatars, images) |
| `ADMIN_PASSWORD` | `lolipop` | Password set for member id 1 after migration |

Override any of these before running:

```bash
DUMP_PATH="/path/to/dump.sql" LEGACY_UPLOADS_DIR="/path/to/uploads" npm run db:migrate-legacy
```

## What is migrated

| Legacy table | New model | Notes |
|---|---|---|
| `clubs` | `Club` | All fields including colours, banking info, backgrounds |
| `member` | `Member` | Roles, avatars, birthdays, Secret Santa links |
| `news` | `News` | Titles, content, internal flag, editor IDs |
| `votes` + `voteoptions` + `votings` | `Vote`, `VoteOption`, `Voting` | All vote settings and cast votes |
| `dates` + `datecancel` | `Event`, `EventCancellation` | Dates, locations, RSVP cancellations |
| `comments` | `Comment` | Linked to news, votes, or events via type detection |
| `gamesandpenalties` + `parts` + `results` | `GameOrPenalty`, `Part`, `Result` | Full scoring history |
| `codes` | `RegistrationCode` | Club registration codes |

### Image copy

All files from `LEGACY_UPLOADS_DIR` are copied recursively into `public/uploads/` in the new project. Existing files are not overwritten, so uploads made after a previous migration run are preserved.

If `LEGACY_UPLOADS_DIR` does not exist, the image copy step is skipped with a warning — the rest of the migration continues normally.

## What is NOT migrated

The following legacy tables have no corresponding model in the new schema and are skipped:

| Legacy table | Reason |
|---|---|
| `balance` | Financial ledger not yet modelled in kegelnetzwerk2 |
| `chat` | Chat feature not yet implemented |
| `counter` | Page-view analytics, not required |

## Orphaned records

The legacy database contains records whose foreign-key targets were deleted at some point (e.g. parts belonging to a deleted game, comments on a deleted news item, results for a pseudo-member with `memid ≤ 0`). The script handles these gracefully: each upsert has a `.catch()` that skips the row and increments a counter rather than aborting. A summary of skipped rows is printed at the end.

From the actual migration of `dump-kegelnetzwerk1-202603141411.sql` (2026-03-15):

| Situation | Skipped |
|---|---|
| `parts` referencing a deleted `gamesandpenalties` row (id 6) | ~6 |
| `comments` referencing deleted news/vote/event records | 29 |
| `results` with `memid ≤ 0` (legacy pseudo-member / club account) | 3,702 |
| Other orphaned FK rows (votings, cancellations, etc.) | remainder |
| **Total skipped** | **4,160** |

These skipped rows represent genuinely deleted or invalid legacy data and do not need to be recovered.

## Passwords

Legacy passwords are stored as plain **MD5 hashes**. These are migrated as-is into the `passwordHash` field. The authentication layer detects non-bcrypt hashes (they do not start with `$2`) and falls back to MD5 verification. On the first successful login, the password is automatically re-hashed with bcrypt and the MD5 hash is replaced.

### Admin password reset

Because the legacy MD5 hash for member id 1 (the primary admin) may not be known, the script automatically sets a fresh bcrypt password for that account at the end of the migration. The default password is `lolipop`. Override it before running:

```bash
ADMIN_PASSWORD="yourpassword" npm run db:migrate-legacy
```

Change this password immediately after your first login.

## After migration

PostgreSQL auto-increment sequences are reset automatically at the end of the script so that new records created after migration do not collide with migrated IDs.
