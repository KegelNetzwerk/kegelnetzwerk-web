import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// DELETE /api/finance/transactions/bulk-delete — delete multiple transactions (admin only)
export async function DELETE(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { ids: number[] };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
  }

  const { count } = await prisma.financeTransaction.deleteMany({
    where: {
      id: { in: body.ids },
      clubId: member.clubId,
    },
  });

  return NextResponse.json({ count });
}
