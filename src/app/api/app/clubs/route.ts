import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// GET /api/app/clubs
// Returns JSON with the authenticated member's club info
export async function GET(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const club = await prisma.club.findUnique({
    where: { id: member.clubId },
    select: {
      id: true,
      name: true,
      pic: true,
      farbe1: true,
      farbe2: true,
      farbe3: true,
      _count: {
        select: { members: true },
      },
    },
  });

  return NextResponse.json(club);
}
