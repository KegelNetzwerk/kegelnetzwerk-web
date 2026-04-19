import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

async function validate(params: Promise<{ id: string }>) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const sourceId = Number.parseInt(id);
  const existing = await prisma.moneySource.findFirst({
    where: { id: sourceId, clubId: member.clubId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return { member, sourceId };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const v = await validate(params);
  if (v instanceof NextResponse) return v;
  const { sourceId } = v;

  const body = await req.json() as { value?: unknown };
  if (typeof body.value !== 'number' || Number.isNaN(body.value)) {
    return NextResponse.json({ error: 'value required' }, { status: 400 });
  }

  const entry = await prisma.$transaction(async (tx) => {
    await tx.moneySource.update({ where: { id: sourceId }, data: { value: body.value as number } });
    return tx.moneySourceLog.create({ data: { moneySourceId: sourceId, value: body.value as number } });
  });

  return NextResponse.json(entry);
}
