import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, FinanceFrequency } from '@prisma/client';

async function validate(params: Promise<{ id: string }>) {
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
  return { member, paymentId };
}

// PUT /api/finance/regular-payments/[id] — update a regular payment schedule (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const v = await validate(params);
  if (v instanceof NextResponse) return v;
  const { paymentId } = v;

  const body = await req.json() as {
    amount?: number;
    frequency?: string;
    note?: string;
    active?: boolean;
  };

  const allFrequencies = Object.values(FinanceFrequency) as string[];

  const data: { amount?: number; frequency?: FinanceFrequency; note?: string; active?: boolean } = {};
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.frequency && allFrequencies.includes(body.frequency) && body.frequency !== FinanceFrequency.NONE) {
    data.frequency = body.frequency as FinanceFrequency;
  }
  if (body.note !== undefined) data.note = body.note;
  if (body.active !== undefined) data.active = body.active;

  const updated = await prisma.regularMemberPayment.update({
    where: { id: paymentId },
    data,
    include: { member: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/finance/regular-payments/[id] — delete a regular payment schedule (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const v = await validate(params);
  if (v instanceof NextResponse) return v;
  const { paymentId } = v;

  await prisma.regularMemberPayment.delete({ where: { id: paymentId } });
  return NextResponse.json({ ok: true });
}
