import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceFrequency } from '@prisma/client';

// GET /api/finance/regular-payments — list regular payment schedules
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const where = member.role === Role.ADMIN
    ? { clubId: member.clubId }
    : { memberId: member.id };

  const payments = await prisma.regularMemberPayment.findMany({
    where,
    include: { member: { select: { id: true, nickname: true } } },
    orderBy: [{ member: { nickname: 'asc' } }, { id: 'asc' }],
  });

  return NextResponse.json(payments);
}

// POST /api/finance/regular-payments — create a regular payment schedule (admin only)
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    memberId: number;
    amount: number;
    frequency: string;
    note?: string;
  };

  const allFrequencies = Object.values(FinanceFrequency) as string[];
  if (!allFrequencies.includes(body.frequency) || body.frequency === FinanceFrequency.NONE) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
  }

  const target = await prisma.member.findUnique({
    where: { id: body.memberId },
    select: { clubId: true },
  });
  if (!target || target.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const payment = await prisma.regularMemberPayment.create({
    data: {
      clubId: member.clubId,
      memberId: body.memberId,
      amount: body.amount,
      frequency: body.frequency as FinanceFrequency,
      note: body.note ?? '',
    },
    include: { member: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(payment);
}
