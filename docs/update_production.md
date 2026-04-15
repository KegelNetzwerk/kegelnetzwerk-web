# Updating the Production Server

This document describes the full process to deploy an updated version of KegelNetzwerk Web to the production server.

## Steps

### 1. Pull the latest code

```bash
git pull
```

### 2. Install dependencies

```bash
npm install
```

### 3. Apply any pending database migrations

```bash
npx prisma migrate deploy
```

### 4. Regenerate the Prisma client

```bash
npx prisma generate
```

### 5. Build the application

```bash
npm run build
```

### 6. Restart the server

Stop the currently running process (e.g. via your process manager or by killing the existing `npm run start` process), then start it again:

```bash
npm run start
```

If you are using a process manager like **PM2**, use the reload/restart command instead:

```bash
pm2 restart kegelnetzwerk-web
```

## Notes

- Always run `npm run build` before `npm run start`. The `start` script serves the last successful build — skipping the build step will deploy stale code.
- If the `prisma migrate deploy` step fails, do not proceed with the build. Investigate and resolve the migration issue first to avoid a schema/code mismatch in production.
- Environment variables are read at **build time** (for static values) and at **runtime**. If you update `.env.production`, you must rebuild and restart for changes to take effect.
