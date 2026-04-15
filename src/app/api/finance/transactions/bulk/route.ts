import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceTxType } from '@prisma/client';

// POST /api/finance/transactions/bulk — create a transaction for all (or most) members (admin only)
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    type: string;
    amount: number;
    note?: string;
    date?: string;
    excludedMemberIds?: number[];
  };

  const validTypes = Object.values(FinanceTxType);
  if (!validTypes.includes(body.type as FinanceTxType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const excluded = body.excludedMemberIds ?? [];

  const members = await prisma.member.findMany({
    where: {
      clubId: member.clubId,
      ...(excluded.length > 0 ? { id: { notIn: excluded } } : {}),
    },
    select: { id: true },
  });

  const date = body.date ? new Date(body.date) : new Date();

  await prisma.financeTransaction.createMany({
    data: members.map((m) => ({
      clubId: member.clubId,
      memberId: m.id,
      type: body.type as FinanceTxType,
      amount: body.amount,
      note: body.note ?? '',
      date,
    })),
  });

  return NextResponse.json({ count: members.length });
}
