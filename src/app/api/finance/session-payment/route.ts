import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceTxType } from '@prisma/client';

// GET /api/finance/session-payment              — list recent sessions
// GET /api/finance/session-payment?sessionGroup=N — attendees for a specific session
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sessionGroupParam = searchParams.get('sessionGroup');

  if (sessionGroupParam !== null) {
    // Return attendees for a specific session
    const sessionGroup = Number.parseInt(sessionGroupParam);
    if (Number.isNaN(sessionGroup)) {
      return NextResponse.json({ error: 'Invalid sessionGroup' }, { status: 400 });
    }

    const [memberResults, guestResults, dateResult] = await Promise.all([
      prisma.result.findMany({
        where: { clubId: member.clubId, sessionGroup, memberId: { not: null } },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
      prisma.result.findMany({
        where: { clubId: member.clubId, sessionGroup, guestId: { not: null } },
        select: { guestId: true },
        distinct: ['guestId'],
      }),
      prisma.result.findFirst({
        where: { clubId: member.clubId, sessionGroup },
        select: { date: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const memberIds = memberResults.map((r) => r.memberId as number);
    const guestIds = guestResults.map((r) => r.guestId as number);

    const [members, guests] = await Promise.all([
      memberIds.length > 0
        ? prisma.member.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, nickname: true },
            orderBy: { nickname: 'asc' },
          })
        : Promise.resolve([]),
      guestIds.length > 0
        ? prisma.guest.findMany({
            where: { id: { in: guestIds } },
            select: { id: true, nickname: true },
            orderBy: { nickname: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      sessionGroup,
      date: dateResult?.date.toISOString() ?? null,
      members,
      guests,
    });
  }

  // List recent sessions
  const grouped = await prisma.result.groupBy({
    by: ['sessionGroup'],
    where: { clubId: member.clubId },
    _min: { date: true },
    _count: { id: true },
    orderBy: { _min: { date: 'desc' } },
    take: 50,
  });

  // Count distinct attendees per session (members + guests)
  const sessions = await Promise.all(
    grouped.map(async (g) => {
      const [memberCount, guestCount] = await Promise.all([
        prisma.result.findMany({
          where: { clubId: member.clubId, sessionGroup: g.sessionGroup, memberId: { not: null } },
          select: { memberId: true },
          distinct: ['memberId'],
        }),
        prisma.result.findMany({
          where: { clubId: member.clubId, sessionGroup: g.sessionGroup, guestId: { not: null } },
          select: { guestId: true },
          distinct: ['guestId'],
        }),
      ]);
      return {
        sessionGroup: g.sessionGroup,
        date: g._min.date!.toISOString(),
        attendeeCount: memberCount.length + guestCount.length,
      };
    })
  );

  return NextResponse.json({ sessions });
}

// POST /api/finance/session-payment — create transactions for all included attendees
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    sessionGroup: number;
    totalAmount: number;
    note?: string;
    includedMemberIds: number[];
    includedGuestIds: number[];
  };

  const { sessionGroup, totalAmount, note, includedMemberIds, includedGuestIds } = body;

  const totalParticipants = includedMemberIds.length + includedGuestIds.length;
  if (totalParticipants === 0) {
    return NextResponse.json({ error: 'No attendees selected' }, { status: 400 });
  }
  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  // Verify all member/guest IDs belong to this club
  const [memberCheck, guestCheck] = await Promise.all([
    includedMemberIds.length > 0
      ? prisma.member.count({ where: { id: { in: includedMemberIds }, clubId: member.clubId } })
      : Promise.resolve(0),
    includedGuestIds.length > 0
      ? prisma.guest.count({ where: { id: { in: includedGuestIds }, clubId: member.clubId } })
      : Promise.resolve(0),
  ]);

  if (memberCheck !== includedMemberIds.length || guestCheck !== includedGuestIds.length) {
    return NextResponse.json({ error: 'Invalid member or guest IDs' }, { status: 400 });
  }

  const perPerson = -Math.round((totalAmount / totalParticipants) * 100) / 100;
  const txDate = new Date();
  const txNote = note ?? '';

  const memberTxData = includedMemberIds.map((memberId) => ({
    clubId: member.clubId,
    memberId,
    type: FinanceTxType.COLLECTIVE,
    amount: perPerson,
    note: txNote,
    date: txDate,
  }));

  const guestTxData = includedGuestIds.map((guestId) => ({
    clubId: member.clubId,
    guestId,
    type: FinanceTxType.COLLECTIVE,
    amount: perPerson,
    note: txNote,
    date: txDate,
  }));

  await prisma.$transaction([
    prisma.financeTransaction.createMany({ data: memberTxData }),
    prisma.financeTransaction.createMany({ data: guestTxData }),
  ]);

  return NextResponse.json({ txCount: totalParticipants, perPerson });
}
