import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { buildSantaHistoryRows } from '@/lib/secret-santa-utils';

// GET /api/secret-santa/pairings — list all current pairings, plus each member's own
// yearly history, for the admin pairings table (admin only)
export async function GET() {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentYear = new Date().getFullYear();

  const [members, allAssignments, allYears] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: current.clubId },
      orderBy: { nickname: 'asc' },
      select: {
        id: true,
        nickname: true,
        pic: true,
        isInactive: true,
        secretSantaPartner: { select: { id: true, nickname: true, pic: true } },
      },
    }),
    prisma.secretSantaAssignment.findMany({
      where: { clubId: current.clubId },
      orderBy: { year: 'desc' },
      include: { receiver: { select: { nickname: true, pic: true } } },
    }),
    prisma.secretSantaAssignment.findMany({
      where: { clubId: current.clubId },
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'desc' },
    }),
  ]);

  const historyByGiver = new Map<number, typeof allAssignments>();
  for (const assignment of allAssignments) {
    const list = historyByGiver.get(assignment.giverId) ?? [];
    list.push(assignment);
    historyByGiver.set(assignment.giverId, list);
  }

  const result = members.map((m) => ({
    ...m,
    history: buildSantaHistoryRows(historyByGiver.get(m.id) ?? [], allYears, currentYear, m.secretSantaPartner),
  }));

  return NextResponse.json(result);
}

// PATCH /api/secret-santa/pairings — set a single giver's receiver (admin only)
export async function PATCH(req: NextRequest) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { giverId, receiverId } = await req.json();
  if (typeof giverId !== 'number' || (receiverId !== null && typeof receiverId !== 'number')) {
    return NextResponse.json({ error: 'invalidInput' }, { status: 400 });
  }
  if (giverId === receiverId) {
    return NextResponse.json({ error: 'selfAssignment' }, { status: 422 });
  }

  const [giver, receiver] = await Promise.all([
    prisma.member.findFirst({ where: { id: giverId, clubId: current.clubId } }),
    receiverId !== null
      ? prisma.member.findFirst({ where: { id: receiverId, clubId: current.clubId } })
      : Promise.resolve(null),
  ]);
  if (!giver || (receiverId !== null && !receiver)) {
    return NextResponse.json({ error: 'invalidMember' }, { status: 404 });
  }
  if (receiver?.isInactive) {
    return NextResponse.json({ error: 'inactiveReceiver' }, { status: 422 });
  }

  const year = new Date().getFullYear();

  if (receiverId !== null) {
    await prisma.$transaction([
      prisma.member.update({ where: { id: giverId }, data: { secretSantaPartnerId: receiverId } }),
      prisma.secretSantaAssignment.upsert({
        where: { clubId_giverId_year: { clubId: current.clubId, giverId, year } },
        create: { clubId: current.clubId, giverId, receiverId, year },
        update: { receiverId },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.member.update({ where: { id: giverId }, data: { secretSantaPartnerId: null } }),
      prisma.secretSantaAssignment.deleteMany({
        where: { clubId: current.clubId, giverId, year },
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
