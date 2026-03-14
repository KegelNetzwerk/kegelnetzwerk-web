// Seed script: inserts a registration code so the first club can be created.
// Run with: npx prisma db seed
//
// The plain-text code below is what you type on the /register page.
// Change it to something secret before running in production.

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const REGISTRATION_CODE = 'kegel2026';

async function main() {
  const hashed = crypto.createHash('sha256').update(REGISTRATION_CODE).digest('hex');

  await prisma.registrationCode.upsert({
    where: { code: hashed },
    update: {},
    create: { code: hashed },
  });

  console.log(`Registration code seeded: "${REGISTRATION_CODE}"`);
  console.log('Use this code on the /register page to create your first club.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
