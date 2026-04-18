import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { name?: string; value?: number };
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const value = typeof body.value === 'number' && !Number.isNaN(body.value) ? body.value : 0;

  const source = await prisma.$transaction(async (tx) => {
    const s = await tx.moneySource.create({
      data: { clubId: member.clubId, name: body.name!.trim(), value },
    });
    if (s.value !== 0) {
      await tx.moneySourceLog.create({ data: { moneySourceId: s.id, value: s.value } });
    }
    return tx.moneySource.findUniqueOrThrow({
      where: { id: s.id },
      include: { log: { orderBy: { createdAt: 'desc' } } },
    });
  });

  return NextResponse.json(source);
}
