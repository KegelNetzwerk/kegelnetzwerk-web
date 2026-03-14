import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// GET /api/app/members
// Returns JSON list of all members in the authenticated member's club
export async function GET(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const members = await prisma.member.findMany({
    where: { clubId: member.clubId },
    orderBy: { nickname: 'asc' },
    select: {
      id: true,
      nickname: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthday: true,
      role: true,
      pic: true,
    },
  });

  return NextResponse.json(members);
}
