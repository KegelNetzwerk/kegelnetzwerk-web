import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// DELETE /api/finance/transactions/[id] — delete a transaction (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const txId = Number.parseInt(id);

  const tx = await prisma.financeTransaction.findUnique({
    where: { id: txId },
    select: { clubId: true, payoffEventId: true },
  });

  if (!tx || tx.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.financeTransaction.delete({ where: { id: txId } });
  return NextResponse.json({ ok: true });
}
