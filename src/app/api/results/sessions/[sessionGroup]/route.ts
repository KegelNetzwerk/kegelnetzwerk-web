import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

type Params = { params: Promise<{ sessionGroup: string }> };

// GET /api/results/sessions/[sessionGroup]
// Returns all results for the session with formula fields and createdAt.
export async function GET(req: NextRequest, { params }: Params) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { sessionGroup } = await params;
  const sg = Number.parseInt(sessionGroup);
  if (Number.isNaN(sg)) return NextResponse.json({ error: 'Invalid sessionGroup' }, { status: 400 });

  const results = await prisma.result.findMany({
    where: { sessionGroup: sg, clubId: member.clubId },
    include: {
      member: { select: { nickname: true, pic: true } },
      guest: { select: { nickname: true } },
      part: { select: { name: true, unit: true, factor: true, bonus: true, once: true, pic: true } },
      gameOrPenalty: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (results.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    date: results[0].date.toISOString(),
    results: results.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      guestId: r.guestId,
      nickname: r.member?.nickname ?? r.guest?.nickname ?? '?',
      isGuest: r.guestId !== null,
      playerPic: r.member?.pic ?? 'none',
      gopId: r.gopId,
      gopName: r.gameOrPenalty.name,
      partId: r.partId,
      partName: r.part.name,
      partPic: r.part.pic,
      unit: r.part.unit,
      factor: r.part.factor,
      bonus: r.part.bonus,
      value: r.value,
      once: r.part.once,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

// DELETE /api/results/sessions/[sessionGroup]
// Deletes all results for the session.
export async function DELETE(req: NextRequest, { params }: Params) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { sessionGroup } = await params;
  const sg = Number.parseInt(sessionGroup);
  if (Number.isNaN(sg)) return NextResponse.json({ error: 'Invalid sessionGroup' }, { status: 400 });

  await prisma.result.deleteMany({
    where: { sessionGroup: sg, clubId: member.clubId },
  });

  return NextResponse.json({ ok: true });
}
