import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { memberId?: number; delta?: number };
  const { memberId, delta } = body;

  if (typeof memberId !== 'number' || typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }

  const target = await prisma.member.findFirst({ where: { id: memberId, clubId: member.clubId } });
  if (!target) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { kncBalance: { increment: delta } },
    select: { id: true, kncBalance: true },
  });

  return NextResponse.json(updated);
}
