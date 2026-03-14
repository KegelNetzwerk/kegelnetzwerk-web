import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import GamesClient from './GamesClient';

export default async function GamesPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');
  if (member.role !== 'ADMIN') redirect('/news');

  const games = await prisma.gameOrPenalty.findMany({
    where: { clubId: member.clubId },
    include: { parts: { orderBy: { id: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  return <GamesClient initialGames={JSON.parse(JSON.stringify(games))} />;
}
