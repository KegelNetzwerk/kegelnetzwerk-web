import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// GET /api/app/games
// Returns all games/penalties with their parts for the authenticated member's club
export async function GET(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const games = await prisma.gameOrPenalty.findMany({
    where: { clubId: member.clubId },
    include: { parts: { orderBy: { id: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(games);
}
