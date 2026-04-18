import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// POST /api/app/finance/donate
// Deducts amount from member's Euro balance and awards 100 KNC per €1.
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { amount?: unknown };
  const amount = Number(body.amount);
  if (!isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const [updatedMember, aggregate] = await prisma.$transaction(async (tx) => {
    await tx.financeTransaction.create({
      data: {
        clubId: member.clubId,
        memberId: member.id,
        type: 'DONATION',
        amount: -amount,
        note: '',
        date: new Date(),
      },
    });

    const updated = await tx.member.update({
      where: { id: member.id },
      data: { kncBalance: { increment: amount * 100 } },
      select: { kncBalance: true },
    });

    const agg = await tx.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { memberId: member.id, clubId: member.clubId },
    });

    return [updated, agg];
  });

  return NextResponse.json({
    kncBalance: updatedMember.kncBalance,
    euroBalance: Math.round((aggregate._sum.amount ?? 0) * 100) / 100,
  });
}
