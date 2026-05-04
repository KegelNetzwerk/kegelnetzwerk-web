import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

// POST /api/results
// Creates a single result in an existing session.
// Body: { sessionGroup, memberId?, guestId?, partId, gopId, value? }
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    sessionGroup: number;
    memberId?: number;
    guestId?: number;
    partId: number;
    gopId: number;
    value?: number;
    createdAt?: string;
  };
  try {
    body = await req.json();
    if (
      typeof body.sessionGroup !== 'number' ||
      typeof body.partId !== 'number' ||
      typeof body.gopId !== 'number' ||
      (body.memberId == null && body.guestId == null)
    ) {
      throw new Error('Invalid body');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const part = await prisma.part.findFirst({
    where: { id: body.partId, gameOrPenaltyId: body.gopId, clubId: member.clubId },
    select: { id: true, variable: true, value: true },
  });
  if (!part) return NextResponse.json({ error: 'invalidPartId' }, { status: 422 });

  if (body.memberId != null) {
    const validMember = await prisma.member.findFirst({
      where: { id: body.memberId, clubId: member.clubId },
      select: { id: true },
    });
    if (!validMember) return NextResponse.json({ error: 'invalidMemberId' }, { status: 422 });
  }

  if (body.guestId != null) {
    const validGuest = await prisma.guest.findFirst({
      where: { id: body.guestId, clubId: member.clubId },
      select: { id: true },
    });
    if (!validGuest) return NextResponse.json({ error: 'invalidGuestId' }, { status: 422 });
  }

  const sessionResult = await prisma.result.findFirst({
    where: { sessionGroup: body.sessionGroup, clubId: member.clubId },
    select: { date: true },
  });
  if (!sessionResult) return NextResponse.json({ error: 'sessionNotFound' }, { status: 404 });

  const value = part.variable ? (body.value ?? 0) : part.value;
  if (Number.isNaN(value)) return NextResponse.json({ error: 'invalidValue' }, { status: 400 });

  const createdAtOverride = body.createdAt ? new Date(body.createdAt) : undefined;
  if (createdAtOverride && Number.isNaN(createdAtOverride.getTime())) {
    return NextResponse.json({ error: 'invalidCreatedAt' }, { status: 400 });
  }

  const created = await prisma.result.create({
    data: {
      clubId: member.clubId,
      memberId: body.memberId ?? null,
      guestId: body.guestId ?? null,
      partId: body.partId,
      gopId: body.gopId,
      value,
      date: sessionResult.date,
      sessionGroup: body.sessionGroup,
      ...(createdAtOverride ? { createdAt: createdAtOverride } : {}),
    },
    include: {
      member: { select: { nickname: true, pic: true } },
      guest: { select: { nickname: true } },
      part: { select: { name: true, unit: true, factor: true, bonus: true, once: true, pic: true } },
      gameOrPenalty: { select: { name: true } },
    },
  });

  return NextResponse.json({
    id: created.id,
    memberId: created.memberId,
    guestId: created.guestId,
    nickname: created.member?.nickname ?? created.guest?.nickname ?? '?',
    isGuest: created.guestId !== null,
    playerPic: created.member?.pic ?? 'none',
    gopId: created.gopId,
    gopName: created.gameOrPenalty.name,
    partId: created.partId,
    partName: created.part.name,
    partPic: created.part.pic,
    unit: created.part.unit,
    factor: created.part.factor,
    bonus: created.part.bonus,
    value: created.value,
    once: created.part.once,
    createdAt: created.createdAt.toISOString(),
  });
}
