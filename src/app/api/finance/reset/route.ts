import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceTxType } from '@prisma/client';

// POST /api/finance/reset — reset balances to zero (admin only)
// Body: { memberIds?: number[], confirm: true }
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { memberIds?: number[]; confirm?: boolean };

  if (!body.confirm) {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
  }

  const targetMemberIds = body.memberIds && body.memberIds.length > 0
    ? body.memberIds
    : (await prisma.member.findMany({
        where: { clubId: member.clubId },
        select: { id: true },
      })).map((m) => m.id);

  // Compute current balance per member
  const balances = await prisma.financeTransaction.groupBy({
    by: ['memberId'],
    where: {
      clubId: member.clubId,
      memberId: { in: targetMemberIds },
    },
    _sum: { amount: true },
  });

  const now = new Date();
  const resetData = balances
    .filter((b) => b.memberId !== null && (b._sum.amount ?? 0) !== 0)
    .map((b) => ({
      clubId: member.clubId,
      memberId: b.memberId as number,
      type: FinanceTxType.RESET,
      amount: -(b._sum.amount ?? 0),
      note: '',
      date: now,
    }));

  if (resetData.length > 0) {
    await prisma.financeTransaction.createMany({ data: resetData });
  }

  return NextResponse.json({ resetCount: resetData.length });
}
