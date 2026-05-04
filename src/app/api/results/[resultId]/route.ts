import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

type Params = { params: Promise<{ resultId: string }> };

// DELETE /api/results/[resultId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { resultId } = await params;
  const id = Number.parseInt(resultId);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const existing = await prisma.result.findFirst({
    where: { id, clubId: member.clubId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.result.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
