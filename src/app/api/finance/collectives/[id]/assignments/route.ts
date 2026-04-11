import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceTxType } from '@prisma/client';

// GET /api/finance/collectives/[id]/assignments — list assignments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const collectiveId = Number.parseInt(id);

  const collective = await prisma.collectiveCharge.findUnique({
    where: { id: collectiveId },
    select: { clubId: true },
  });
  if (!collective || collective.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const assignments = await prisma.collectiveChargeAssignment.findMany({
    where: { collectiveId },
    include: { member: { select: { id: true, nickname: true } } },
    orderBy: { member: { nickname: 'asc' } },
  });

  return NextResponse.json(assignments);
}

// PATCH /api/finance/collectives/[id]/assignments — pay/unpay/exclude/include a member
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const collectiveId = Number.parseInt(id);

  const collective = await prisma.collectiveCharge.findUnique({
    where: { id: collectiveId },
    select: { clubId: true },
  });
  if (!collective || collective.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as {
    memberId: number;
    action: 'pay' | 'unpay' | 'exclude' | 'include';
    amount?: number;
  };

  const assignment = await prisma.collectiveChargeAssignment.findUnique({
    where: { collectiveId_memberId: { collectiveId, memberId: body.memberId } },
  });
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (body.action === 'pay') {
    if (assignment.paidAt) {
      return NextResponse.json({ error: 'Already paid' }, { status: 409 });
    }
    const amount = body.amount ?? assignment.amount;
    await prisma.$transaction([
      prisma.financeTransaction.create({
        data: {
          clubId: member.clubId,
          memberId: body.memberId,
          type: FinanceTxType.COLLECTIVE,
          amount,
          note: '',
          collectiveId,
          date: new Date(),
        },
      }),
      prisma.collectiveChargeAssignment.update({
        where: { collectiveId_memberId: { collectiveId, memberId: body.memberId } },
        data: { paidAt: new Date(), amount },
      }),
    ]);
  } else if (body.action === 'unpay') {
    if (!assignment.paidAt) {
      return NextResponse.json({ error: 'Not paid yet' }, { status: 409 });
    }
    await prisma.$transaction([
      prisma.financeTransaction.deleteMany({
        where: {
          clubId: member.clubId,
          memberId: body.memberId,
          collectiveId,
          type: FinanceTxType.COLLECTIVE,
        },
      }),
      prisma.collectiveChargeAssignment.update({
        where: { collectiveId_memberId: { collectiveId, memberId: body.memberId } },
        data: { paidAt: null },
      }),
    ]);
  } else if (body.action === 'exclude') {
    await prisma.collectiveChargeAssignment.update({
      where: { collectiveId_memberId: { collectiveId, memberId: body.memberId } },
      data: { excluded: true },
    });
  } else if (body.action === 'include') {
    await prisma.collectiveChargeAssignment.update({
      where: { collectiveId_memberId: { collectiveId, memberId: body.memberId } },
      data: { excluded: false },
    });
  }

  const updated = await prisma.collectiveChargeAssignment.findUnique({
    where: { collectiveId_memberId: { collectiveId, memberId: body.memberId } },
    include: { member: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(updated);
}

// POST /api/finance/collectives/[id]/assignments — add a member assignment (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const collectiveId = Number.parseInt(id);

  const collective = await prisma.collectiveCharge.findUnique({
    where: { id: collectiveId },
    select: { clubId: true, defaultAmount: true },
  });
  if (!collective || collective.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as { memberId: number; amount?: number };

  const target = await prisma.member.findUnique({
    where: { id: body.memberId },
    select: { clubId: true },
  });
  if (!target || target.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const assignment = await prisma.collectiveChargeAssignment.create({
    data: {
      collectiveId,
      memberId: body.memberId,
      amount: body.amount ?? collective.defaultAmount,
    },
    include: { member: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(assignment);
}
