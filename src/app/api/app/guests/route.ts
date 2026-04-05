import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// GET /api/app/guests
// Returns all guests for the authenticated member's club
export async function GET(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const guests = await prisma.guest.findMany({
    where: { clubId: member.clubId },
    select: { id: true, nickname: true, firstName: true, lastName: true },
    orderBy: { nickname: 'asc' },
  });

  return NextResponse.json(guests);
}

interface GuestBody {
  nickname: string;
  firstName?: string;
  lastName?: string;
}

// POST /api/app/guests
// Upserts a guest by (clubId, nickname) — idempotent
// Body: { nickname, firstName?, lastName? }
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: GuestBody;
  try {
    body = await req.json();
    if (!body.nickname?.trim()) throw new Error('nickname required');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const guest = await prisma.guest.upsert({
    where: { clubId_nickname: { clubId: member.clubId, nickname: body.nickname.trim() } },
    update: {
      firstName: body.firstName ?? undefined,
      lastName: body.lastName ?? undefined,
    },
    create: {
      clubId: member.clubId,
      nickname: body.nickname.trim(),
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
    },
    select: { id: true, nickname: true, firstName: true, lastName: true },
  });

  return NextResponse.json(guest);
}
