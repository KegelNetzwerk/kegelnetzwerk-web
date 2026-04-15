import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildPayoffDateFilter } from '@/lib/finance-utils';
import { sendPushToClub } from '@/lib/push';
import { Role, FinanceTxType, Unit } from '@prisma/client';

async function getPayoffWindow(clubId: number) {
  const settings = await prisma.clubFinanceSettings.findUnique({ where: { clubId } });
  return { settings, fromDate: settings?.lastPayoffAt ?? null, toDate: new Date() };
}

// GET /api/finance/payoff — preview what a payoff would generate
export async function GET() {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { settings, fromDate, toDate } = await getPayoffWindow(member.clubId);

  // Pending euro penalties since last payoff
  const penaltyResults = await prisma.result.findMany({
    where: { clubId: member.clubId, memberId: { not: null }, part: { unit: 'EURO' }, ...buildPayoffDateFilter(fromDate, toDate) },
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

  const { settings, fromDate, toDate } = await getPayoffWindow(member.clubId);

  // Fetch euro-unit results since last payoff
  const penaltyResults = await prisma.result.findMany({
    where: { clubId: member.clubId, memberId: { not: null }, part: { unit: 'EURO' }, ...buildPayoffDateFilter(fromDate, toDate) },
    include: { part: { select: { value: true, factor: true, bonus: true } } },
  });

  const penaltiesByMember = new Map<number, number>();
  for (const r of penaltyResults) {
    if (!r.memberId) continue;
    const penaltyAmount = r.value * r.part.factor + r.part.bonus;
    penaltiesByMember.set(r.memberId, (penaltiesByMember.get(r.memberId) ?? 0) + penaltyAmount);
  }

  const activeMembers = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { id: true, isInactive: true },
  });

  const regularPayments = await prisma.regularMemberPayment.findMany({
    where: { clubId: member.clubId, active: true },
    select: { memberId: true, amount: true, note: true },
  });

  const feeAmount = settings?.feeAmount ?? 0;
  const feeFrequency = settings?.feeFrequency ?? 'NONE';
  const guestFeeAmount = settings?.guestFeeAmount ?? 0;

  // Count distinct sessions per member for PER_SESSION club fee
  const memberSessionResults = feeFrequency === 'PER_SESSION' && feeAmount > 0
    ? await prisma.result.findMany({
        where: {
          clubId: member.clubId,
          memberId: { not: null },
          ...buildPayoffDateFilter(fromDate, toDate),
        },
        select: { memberId: true, sessionGroup: true },
        distinct: ['memberId', 'sessionGroup'],
      })
    : [];

  const sessionsByMember = new Map<number, number>();
  for (const r of memberSessionResults) {
    if (!r.memberId) continue;
    sessionsByMember.set(r.memberId, (sessionsByMember.get(r.memberId) ?? 0) + 1);
  }

  // Fetch guest euro-unit results since last payoff
  const guestPenaltyResults = await prisma.result.findMany({
    where: {
      clubId: member.clubId,
      guestId: { not: null },
      part: { unit: Unit.EURO },
      ...buildPayoffDateFilter(fromDate, toDate),
    },
    include: {
      part: { select: { value: true, factor: true, bonus: true } },
    },
  });

  const penaltiesByGuest = new Map<number, number>();
  for (const r of guestPenaltyResults) {
    if (!r.guestId) continue;
    const penaltyAmount = r.value * r.part.factor + r.part.bonus;
    penaltiesByGuest.set(r.guestId, (penaltiesByGuest.get(r.guestId) ?? 0) + penaltyAmount);
  }

  // Count distinct sessions per guest for GUEST_FEE
  const guestSessionResults = guestFeeAmount > 0
    ? await prisma.result.findMany({
        where: {
          clubId: member.clubId,
          guestId: { not: null },
          ...buildPayoffDateFilter(fromDate, toDate),
        },
        select: { guestId: true, sessionGroup: true },
        distinct: ['guestId', 'sessionGroup'],
      })
    : [];

  const sessionsByGuest = new Map<number, number>();
  for (const r of guestSessionResults) {
    if (!r.guestId) continue;
    sessionsByGuest.set(r.guestId, (sessionsByGuest.get(r.guestId) ?? 0) + 1);
  }

  // Collect all guestIds that have any activity
  const activeGuestIds = new Set([
    ...penaltiesByGuest.keys(),
    ...sessionsByGuest.keys(),
  ]);

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

    const memberTxData: {
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
        memberTxData.push({
          clubId: member.clubId,
          memberId: m.id,
          type: FinanceTxType.PENALTY,
          amount: -Math.round(penaltyTotal * 100) / 100,
          note: '',
          payoffEventId: payoffEvent.id,
          date: toDate,
        });
      }

      // Club fee: debit (flat or per-session) — skipped for inactive members
      if (feeAmount > 0 && !m.isInactive) {
        const sessionCount = feeFrequency === 'PER_SESSION' ? (sessionsByMember.get(m.id) ?? 0) : 1;
        if (sessionCount > 0) {
          memberTxData.push({
            clubId: member.clubId,
            memberId: m.id,
            type: FinanceTxType.CLUB_FEE,
            amount: -Math.round(feeAmount * sessionCount * 100) / 100,
            note: feeFrequency === 'PER_SESSION' ? `${sessionCount}x` : '',
            payoffEventId: payoffEvent.id,
            date: toDate,
          });
        }
      }

      // Regular income for this member: credit (positive)
      const rp = regularPayments.filter((p) => p.memberId === m.id);
      for (const p of rp) {
        memberTxData.push({
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

    const guestTxData: {
      clubId: number;
      guestId: number;
      type: FinanceTxType;
      amount: number;
      note: string;
      payoffEventId: number;
      date: Date;
    }[] = [];

    for (const guestId of activeGuestIds) {
      const penaltyTotal = penaltiesByGuest.get(guestId) ?? 0;
      if (penaltyTotal > 0) {
        guestTxData.push({
          clubId: member.clubId,
          guestId,
          type: FinanceTxType.PENALTY,
          amount: -Math.round(penaltyTotal * 100) / 100,
          note: '',
          payoffEventId: payoffEvent.id,
          date: toDate,
        });
      }

      const sessionCount = sessionsByGuest.get(guestId) ?? 0;
      if (guestFeeAmount > 0 && sessionCount > 0) {
        guestTxData.push({
          clubId: member.clubId,
          guestId,
          type: FinanceTxType.GUEST_FEE,
          amount: -Math.round(sessionCount * guestFeeAmount * 100) / 100,
          note: `${sessionCount}x`,
          payoffEventId: payoffEvent.id,
          date: toDate,
        });
      }
    }

    await tx.financeTransaction.createMany({ data: memberTxData });
    await tx.financeTransaction.createMany({ data: guestTxData });

    // Update lastPayoffAt
    await tx.clubFinanceSettings.upsert({
      where: { clubId: member.clubId },
      create: { clubId: member.clubId, lastPayoffAt: toDate },
      update: { lastPayoffAt: toDate },
    });

    return { payoffEventId: payoffEvent.id, txCount: memberTxData.length + guestTxData.length };
  });

  // Fire-and-forget push notification to all club members
  sendPushToClub(
    member.clubId,
    'New Payoff',
    'A new payoff has been executed for your club.',
    { type: 'payoff' }
  ).catch(() => {});

  return NextResponse.json(result);
}
