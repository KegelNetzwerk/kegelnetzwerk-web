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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const v = await validate(params);
  if (v instanceof NextResponse) return v;
  const { sourceId } = v;

  await prisma.moneySource.delete({ where: { id: sourceId } });
  return NextResponse.json({ ok: true });
}
