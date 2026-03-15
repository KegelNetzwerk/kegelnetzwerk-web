import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ScoringClient from './ScoringClient';

export default async function ScoringPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const [games, club] = await Promise.all([
    prisma.gameOrPenalty.findMany({
      where: { clubId: member.clubId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.club.findUnique({
      where: { id: member.clubId },
      select: { defaultGopId: true },
    }),
  ]);

  return <ScoringClient games={games} defaultGopId={club?.defaultGopId ?? null} />;
}
