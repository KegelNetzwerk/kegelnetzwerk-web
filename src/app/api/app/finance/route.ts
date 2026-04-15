import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// GET /api/app/finance
// Returns the authenticated member's current account balance and the club's PayPal handle.
export async function GET(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [aggregate, club] = await Promise.all([
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { memberId: member.id, clubId: member.clubId },
    }),
    prisma.club.findUnique({
      where: { id: member.clubId },
      select: { paypal: true },
    }),
  ]);

  return NextResponse.json({
    balance: Math.round((aggregate._sum.amount ?? 0) * 100) / 100,
    paypal: club?.paypal ?? null,
  });
}
