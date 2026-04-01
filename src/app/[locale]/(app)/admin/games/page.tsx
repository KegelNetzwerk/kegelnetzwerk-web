import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import GamesClient from './GamesClient';

export default async function GamesPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');
  if (member.role !== 'ADMIN') redirect('/news');

  const [games, club] = await Promise.all([
    prisma.gameOrPenalty.findMany({
      where: { clubId: member.clubId },
      include: { parts: { orderBy: { id: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.club.findUnique({
      where: { id: member.clubId },
      select: { farbe1: true, farbe2: true },
    }),
  ]);

  return (
    <GamesClient
      initialGames={JSON.parse(JSON.stringify(games))}
      clubColor={club?.farbe1 ?? '#005982'}
      clubColor2={club?.farbe2 ?? '#3089AC'}
    />
  );
}
