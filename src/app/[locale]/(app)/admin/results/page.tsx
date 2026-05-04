import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import ResultsClient from './ResultsClient';

export default async function AdminResultsPage() {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) redirect('/');

  const [categories, memberRows, guestRows, yearRows] = await Promise.all([
    prisma.gameOrPenalty.findMany({
      where: { clubId: member.clubId },
      select: {
        id: true,
        name: true,
        parts: {
          select: {
            id: true,
            name: true,
            unit: true,
            variable: true,
            value: true,
            factor: true,
            bonus: true,
            once: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.member.findMany({
      where: { clubId: member.clubId },
      select: { id: true, nickname: true },
      orderBy: { nickname: 'asc' },
    }),
    prisma.guest.findMany({
      where: { clubId: member.clubId },
      select: { id: true, nickname: true },
      orderBy: { nickname: 'asc' },
    }),
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS year
      FROM "Result"
      WHERE "clubId" = ${member.clubId}
      ORDER BY year DESC
    `,
  ]);

  const years = yearRows.map((r) => r.year);

  return (
    <ResultsClient
      categories={categories}
      members={memberRows}
      guests={guestRows}
      years={years}
    />
  );
}
