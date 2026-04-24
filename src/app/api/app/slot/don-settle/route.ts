import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

function isValidFinalWin(originalWin: number, finalWin: number): boolean {
  if (finalWin === 0) return true; // lost everything
  let expected = originalWin;
  for (let i = 0; i < 5; i++) {
    expected *= 2;
    if (finalWin === expected) return true;
  }
  return false;
}

// POST /api/app/slot/don-settle
// Settles a double-or-nothing round by adjusting the balance by (finalWin - originalWin).
// The originalWin was already credited by the spin endpoint; this corrects for the DON outcome.
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { originalWin?: unknown; finalWin?: unknown };
  const originalWin = Number(body.originalWin);
  const finalWin = Number(body.finalWin);

  if (!Number.isInteger(originalWin) || originalWin < 0) {
    return NextResponse.json({ error: 'Invalid originalWin' }, { status: 400 });
  }
  if (!Number.isInteger(finalWin) || finalWin < 0) {
    return NextResponse.json({ error: 'Invalid finalWin' }, { status: 400 });
  }
  if (!isValidFinalWin(originalWin, finalWin)) {
    return NextResponse.json({ error: 'Invalid finalWin' }, { status: 400 });
  }

  const adjustment = finalWin - originalWin;
  if (adjustment === 0) {
    const member_ = await prisma.member.findUnique({
      where: { id: member.id },
      select: { kncBalance: true },
    });
    return NextResponse.json({ kncBalance: member_?.kncBalance ?? 0 });
  }

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { kncBalance: { increment: adjustment } },
    select: { kncBalance: true },
  });

  return NextResponse.json({ kncBalance: updated.kncBalance });
}
