import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceTxType } from '@prisma/client';

// GET /api/finance/payoff — preview what a payoff would generate
export async function GET() {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await prisma.clubFinanceSettings.findUnique({
    where: { clubId: member.clubId },
  });

  const fromDate = settings?.lastPayoffAt ?? null;
  const toDate = new Date();

  // Pending euro penalties since last payoff
  const penaltyResults = await prisma.result.findMany({
    where: {
      clubId: member.clubId,
      memberId: { not: null },
      part: { unit: 'EURO' },
      ...(fromDate ? { date: { gte: fromDate, lt: toDate } } : { date: { lt: toDate } }),
    },
    include: {
      member: { select: { id: true, nickname: true } },
      part: { select: { value: true, factor: true, bonus: true } },
    },
  });

  const penaltiesByMember = new Map<number, { nickname: string; total: number }>();
  for (const r of penaltyResults) {
    if (!r.memberId || !r.member) continue;
    const penaltyAmount = r.value * r.part.factor + r.part.bonus;
    const existing = penaltiesByMember.get(r.memberId);
    if (existing) {
      existing.total += penaltyAmount;
    } else {
      penaltiesByMember.set(r.memberId, { nickname: r.member.nickname, total: penaltyAmount });
    }
  }

  const activeMembers = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { id: true, nickname: true },
    orderBy: { nickname: 'asc' },
  });

  const regularPayments = await prisma.regularMemberPayment.findMany({
    where: { clubId: member.clubId, active: true },
    select: { memberId: true, amount: true },
  });

  return NextResponse.json({
    fromDate: fromDate?.toISOString() ?? null,
    toDate: toDate.toISOString(),
    feeAmount: settings?.feeAmount ?? 0,
    memberCount: activeMembers.length,
    penaltiesByMember: Array.from(penaltiesByMember.entries()).map(([id, data]) => ({
      memberId: id,
      nickname: data.nickname,
      penaltyTotal: Math.round(data.total * 100) / 100,
    })),
    regularPayments,
  });
}

// POST /api/finance/payoff — execute a payoff event (admin only)
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { note?: string };

  const settings = await prisma.clubFinanceSettings.findUnique({
    where: { clubId: member.clubId },
  });

  const fromDate = settings?.lastPayoffAt ?? null;
  const toDate = new Date();

  // Fetch euro-unit results since last payoff
  const penaltyResults = await prisma.result.findMany({
    where: {
      clubId: member.clubId,
      memberId: { not: null },
      part: { unit: 'EURO' },
      ...(fromDate ? { date: { gte: fromDate, lt: toDate } } : { date: { lt: toDate } }),
    },
    include: {
      part: { select: { value: true, factor: true, bonus: true } },
    },
  });

  const penaltiesByMember = new Map<number, number>();
  for (const r of penaltyResults) {
    if (!r.memberId) continue;
    const penaltyAmount = r.value * r.part.factor + r.part.bonus;
    penaltiesByMember.set(r.memberId, (penaltiesByMember.get(r.memberId) ?? 0) + penaltyAmount);
  }

  const activeMembers = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { id: true },
  });

  const regularPayments = await prisma.regularMemberPayment.findMany({
    where: { clubId: member.clubId, active: true },
    select: { memberId: true, amount: true, note: true },
  });

  const feeAmount = settings?.feeAmount ?? 0;

  // Create payoff event + all transactions in one transaction
  const result = await prisma.$transaction(async (tx) => {
    const payoffEvent = await tx.payoffEvent.create({
      data: {
        clubId: member.clubId,
        fromDate,
        toDate,
        feeAmount,
        note: body.note ?? '',
      },
    });

    const transactions: {
      clubId: number;
      memberId: number;
      type: FinanceTxType;
      amount: number;
      note: string;
      payoffEventId: number;
      date: Date;
    }[] = [];

    for (const m of activeMembers) {
      // Penalty: debit (negative = reduces credit)
      const penaltyTotal = penaltiesByMember.get(m.id) ?? 0;
      if (penaltyTotal > 0) {
        transactions.push({
          clubId: member.clubId,
          memberId: m.id,
          type: FinanceTxType.PENALTY,
          amount: -Math.round(penaltyTotal * 100) / 100,
          note: '',
          payoffEventId: payoffEvent.id,
          date: toDate,
        });
      }

      // Club fee: debit
      if (feeAmount > 0) {
        transactions.push({
          clubId: member.clubId,
          memberId: m.id,
          type: FinanceTxType.CLUB_FEE,
          amount: -feeAmount,
          note: '',
          payoffEventId: payoffEvent.id,
          date: toDate,
        });
      }

      // Regular income for this member: credit (positive)
      const rp = regularPayments.filter((p) => p.memberId === m.id);
      for (const p of rp) {
        transactions.push({
          clubId: member.clubId,
          memberId: m.id,
          type: FinanceTxType.REGULAR_INCOME,
          amount: p.amount,
          note: p.note,
          payoffEventId: payoffEvent.id,
          date: toDate,
        });
      }
    }

    await tx.financeTransaction.createMany({ data: transactions });

    // Update lastPayoffAt
    await tx.clubFinanceSettings.upsert({
      where: { clubId: member.clubId },
      create: { clubId: member.clubId, lastPayoffAt: toDate },
      update: { lastPayoffAt: toDate },
    });

    return { payoffEventId: payoffEvent.id, txCount: transactions.length };
  });

  return NextResponse.json(result);
}
