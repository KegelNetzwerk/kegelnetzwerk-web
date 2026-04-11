import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceTxType } from '@prisma/client';

// GET /api/finance/transactions?memberId=&from=&to=&type=&page=
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberIdParam = searchParams.get('memberId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const type = searchParams.get('type');
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
  const pageSize = 50;

  // Non-admins can only see their own transactions
  const targetMemberId = member.role === Role.ADMIN && memberIdParam
    ? Number.parseInt(memberIdParam)
    : member.id;

  // For CLUB_PURCHASE (no memberId) admins can pass memberId=0
  const isClubPurchaseQuery = member.role === Role.ADMIN && memberIdParam === '0';

  const where = {
    clubId: member.clubId,
    ...(isClubPurchaseQuery
      ? { memberId: null, type: FinanceTxType.CLUB_PURCHASE }
      : { memberId: targetMemberId }),
    ...(from ? { date: { gte: new Date(from) } } : {}),
    ...(to ? { date: { lte: new Date(to) } } : {}),
    ...(type && Object.values(FinanceTxType).includes(type as FinanceTxType)
      ? { type: type as FinanceTxType }
      : {}),
  };

  const [total, transactions] = await Promise.all([
    prisma.financeTransaction.count({ where }),
    prisma.financeTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, nickname: true } },
      },
    }),
  ]);

  return NextResponse.json({ transactions, total, page, pageSize });
}

// POST /api/finance/transactions — create a single transaction (admin only)
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    memberId?: number | null;
    type: string;
    amount: number;
    note?: string;
    date?: string;
  };

  const validTypes = Object.values(FinanceTxType);
  if (!validTypes.includes(body.type as FinanceTxType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const txType = body.type as FinanceTxType;

  // CLUB_PURCHASE has no member
  if (txType !== FinanceTxType.CLUB_PURCHASE && !body.memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 });
  }

  // Verify member belongs to same club
  if (body.memberId) {
    const target = await prisma.member.findUnique({
      where: { id: body.memberId },
      select: { clubId: true },
    });
    if (!target || target.clubId !== member.clubId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
  }

  const tx = await prisma.financeTransaction.create({
    data: {
      clubId: member.clubId,
      memberId: body.memberId ?? null,
      type: txType,
      amount: body.amount,
      note: body.note ?? '',
      date: body.date ? new Date(body.date) : new Date(),
    },
    include: { member: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(tx);
}
