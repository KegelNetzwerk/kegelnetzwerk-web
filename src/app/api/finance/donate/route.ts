import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { processDonation } from '@/lib/donate';

// POST /api/finance/donate
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { amount?: unknown };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const result = await processDonation(member.id, member.clubId, amount);
  return NextResponse.json(result);
}
