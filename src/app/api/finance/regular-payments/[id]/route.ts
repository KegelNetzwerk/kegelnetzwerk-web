import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceFrequency } from '@prisma/client';

// PUT /api/finance/regular-payments/[id] — update a regular payment schedule (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const paymentId = Number.parseInt(id);

  const existing = await prisma.regularMemberPayment.findUnique({
    where: { id: paymentId },
    select: { clubId: true },
  });
  if (!existing || existing.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as {
    amount?: number;
    frequency?: string;
    note?: string;
    active?: boolean;
  };

  const allFrequencies = Object.values(FinanceFrequency) as string[];

  const updated = await prisma.regularMemberPayment.update({
    where: { id: paymentId },
    data: {
      ...(body.amount !== undefined ? { amount: body.amount } : {}),
      ...(body.frequency && allFrequencies.includes(body.frequency) && body.frequency !== FinanceFrequency.NONE
        ? { frequency: body.frequency as FinanceFrequency }
        : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
    include: { member: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/finance/regular-payments/[id] — delete a regular payment schedule (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const paymentId = Number.parseInt(id);

  const existing = await prisma.regularMemberPayment.findUnique({
    where: { id: paymentId },
    select: { clubId: true },
  });
  if (!existing || existing.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.regularMemberPayment.delete({ where: { id: paymentId } });
  return NextResponse.json({ ok: true });
}
