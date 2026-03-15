# Migrating data from the legacy PHP application

If you are upgrading from the original PHP/MySQL version of KegelNetzwerk, a migration script is provided that reads the MySQL dump file and imports all data into the PostgreSQL database.

## Prerequisites

- The new PostgreSQL database must already be set up and all Prisma migrations applied (`npx prisma migrate dev`).
- A MySQL dump file of the legacy database (e.g. exported with `mysqldump`).

## Running the migration

```bash
npm run db:migrate-legacy
```

By default the script looks for the dump at:

```
E:\2026_Projects\kegelnetzwerk\Database\dump-kegelnetzwerk1-202603141411.sql
```

To use a different path, set the `DUMP_PATH` environment variable:

```bash
DUMP_PATH="C:\path\to\your\dump.sql" npm run db:migrate-legacy
```

The script is **idempotent** — it uses upsert for every record and can be run multiple times safely without creating duplicates.

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

## What is NOT migrated

The following legacy tables have no corresponding model in the new schema and are skipped:

| Legacy table | Reason |
|---|---|
| `balance` | Financial ledger not yet modelled in kegelnetzwerk2 |
| `chat` | Chat feature not yet implemented |
| `counter` | Page-view analytics, not required |

## Passwords

Legacy passwords are stored as plain **MD5 hashes**. These are migrated as-is into the `passwordHash` field. The authentication layer detects non-bcrypt hashes (they do not start with `$2`) and falls back to MD5 verification. On the first successful login, the password is automatically re-hashed with bcrypt and the MD5 hash is replaced.

## After migration

PostgreSQL auto-increment sequences are reset automatically at the end of the script so that new records created after migration do not collide with migrated IDs.
