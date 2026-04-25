import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { memberId?: number };

  if (body.memberId !== undefined) {
    const target = await prisma.member.findFirst({ where: { id: body.memberId, clubId: member.clubId } });
    if (!target) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    await prisma.member.update({ where: { id: body.memberId }, data: { kncBalance: 0 } });
    return NextResponse.json({ resetCount: 1 });
  }

  const result = await prisma.member.updateMany({
    where: { clubId: member.clubId },
    data: { kncBalance: 0 },
  });
  return NextResponse.json({ resetCount: result.count });
}
