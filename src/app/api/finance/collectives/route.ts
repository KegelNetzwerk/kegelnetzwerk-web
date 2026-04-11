import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// GET /api/finance/collectives — list collective charges for the club
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const collectives = await prisma.collectiveCharge.findMany({
    where: { clubId: member.clubId },
    orderBy: { createdAt: 'desc' },
    include: {
      assignments: {
        include: { member: { select: { id: true, nickname: true } } },
        orderBy: { member: { nickname: 'asc' } },
      },
    },
  });

  return NextResponse.json(collectives);
}

// POST /api/finance/collectives — create a collective charge (admin only)
export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    name: string;
    defaultAmount: number;
    note?: string;
    memberIds?: number[];
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  // Default to all club members if memberIds not specified
  const allMembers = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { id: true },
  });

  const assignMemberIds = body.memberIds && body.memberIds.length > 0
    ? body.memberIds.filter((id) => allMembers.some((m) => m.id === id))
    : allMembers.map((m) => m.id);

  const collective = await prisma.collectiveCharge.create({
    data: {
      clubId: member.clubId,
      name: body.name.trim(),
      defaultAmount: body.defaultAmount,
      note: body.note ?? '',
      assignments: {
        create: assignMemberIds.map((id) => ({
          memberId: id,
          amount: body.defaultAmount,
        })),
      },
    },
    include: {
      assignments: {
        include: { member: { select: { id: true, nickname: true } } },
        orderBy: { member: { nickname: 'asc' } },
      },
    },
  });

  return NextResponse.json(collective);
}
