import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';
import { spin } from '@/lib/slotEngine';

const VALID_BETS = new Set([1, 2, 5, 10]);

// OPTIONS — handled by next.config.ts headers, explicit handler ensures 204 for preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// POST /api/app/slot/spin
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { lines?: unknown; bet?: unknown; freeSpins?: unknown; expandingSymbol?: unknown };
  const lines = Number(body.lines);
  const bet = Number(body.bet);
  const isFreeSpins = body.freeSpins === true;
  const expandingSymbol = typeof body.expandingSymbol === 'string' ? body.expandingSymbol as import('@/lib/slotEngine').SymbolKey : undefined;

  if (!Number.isInteger(lines) || lines < 1 || lines > 10) {
    return NextResponse.json({ error: 'Invalid lines' }, { status: 400 });
  }
  if (!VALID_BETS.has(bet)) {
    return NextResponse.json({ error: 'Invalid bet' }, { status: 400 });
  }

  const totalCost = isFreeSpins ? 0 : lines * bet;
  const result = spin(lines, bet, isFreeSpins ? expandingSymbol : undefined);
  const netChange = result.win - totalCost;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (!isFreeSpins) {
        const current = await tx.member.findUnique({
          where: { id: member.id },
          select: { kncBalance: true },
        });
        if (!current || current.kncBalance < totalCost) {
          throw Object.assign(new Error('Insufficient balance'), { code: 'INSUFFICIENT_BALANCE' });
        }
      }

      return tx.member.update({
        where: { id: member.id },
        data: { kncBalance: { increment: netChange } },
        select: { kncBalance: true },
      });
    });

    return NextResponse.json({
      reels: result.reels,
      originalReels: result.originalReels,
      win: result.win,
      kncBalance: updated.kncBalance,
      featureTriggered: result.featureTriggered,
      expansionApplied: result.expansionApplied,
      // On retrigger (isFreeSpins + featureTriggered) keep existing symbol — send undefined
      expandingSymbol: isFreeSpins ? undefined : result.expandingSymbol,
    });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }
    throw err;
  }
}
