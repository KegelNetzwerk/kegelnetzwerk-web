import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// POST /api/finance/log/clear — delete all finance transactions for the club (admin only)
// Also resets lastPayoffAt, all collective assignment paidAt, and removes payoff events.
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { confirm?: string };
  if (body.confirm !== 'clear log') {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
  }

  await prisma.$transaction([
    // Delete all transactions for this club
    prisma.financeTransaction.deleteMany({ where: { clubId: member.clubId } }),
    // Delete all payoff events
    prisma.payoffEvent.deleteMany({ where: { clubId: member.clubId } }),
    // Reset lastPayoffAt so the next payoff covers the full history
    prisma.clubFinanceSettings.updateMany({
      where: { clubId: member.clubId },
      data: { lastPayoffAt: null },
    }),
    // Reset all collective assignment paidAt (un-mark payments)
    prisma.collectiveChargeAssignment.updateMany({
      where: { collective: { clubId: member.clubId } },
      data: { paidAt: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
