import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

// GET all game/penalty categories for the club
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const games = await prisma.gameOrPenalty.findMany({
    where: { clubId: member.clubId },
    include: { parts: { orderBy: { id: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(games);
}

// POST create a new category (admin only)
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name required.' }, { status: 400 });
  }

  const game = await prisma.gameOrPenalty.create({
    data: { clubId: member.clubId, name: name.trim() },
  });

  return NextResponse.json(game, { status: 201 });
}
