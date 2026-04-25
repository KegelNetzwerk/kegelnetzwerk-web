import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { delta?: number };
  const { delta } = body;

  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }

  await prisma.member.updateMany({
    where: { clubId: member.clubId },
    data: { kncBalance: { increment: delta } },
  });

  const updated = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { id: true, kncBalance: true },
  });

  return NextResponse.json(updated);
}
