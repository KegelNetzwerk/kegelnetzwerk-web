import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, logId } = await params;
  const sourceId = Number.parseInt(id);
  const logIdNum = Number.parseInt(logId);

  const entry = await prisma.moneySourceLog.findFirst({
    where: { id: logIdNum, moneySourceId: sourceId, moneySource: { clubId: member.clubId } },
    select: { id: true },
  });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.moneySourceLog.delete({ where: { id: logIdNum } });
  return NextResponse.json({ ok: true });
}
