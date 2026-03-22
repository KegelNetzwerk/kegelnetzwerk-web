import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

// GET /api/results/sessions?gopId=&from=&to=
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const gopIdParam = searchParams.get('gopId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const parsedGopId = gopIdParam ? parseInt(gopIdParam) : null;
  if (gopIdParam && isNaN(parsedGopId!)) {
    return NextResponse.json({ error: 'Invalid gopId' }, { status: 400 });
  }

  const where = {
    clubId: member.clubId,
    ...(parsedGopId !== null ? { gopId: parsedGopId } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
  };

  const grouped = await prisma.result.groupBy({
    by: ['sessionGroup', 'gopId'],
    where,
    _min: { date: true },
    _count: { id: true },
    orderBy: { _min: { date: 'desc' } },
  });

  const gopIds = [...new Set(grouped.map((g) => g.gopId))];
  const gops = await prisma.gameOrPenalty.findMany({
    where: { id: { in: gopIds } },
    select: { id: true, name: true },
  });
  const gopMap = new Map(gops.map((g) => [g.id, g.name]));

  const sessions = grouped.map((g) => ({
    sessionGroup: g.sessionGroup,
    date: g._min.date!.toISOString(),
    gopId: g.gopId,
    gopName: gopMap.get(g.gopId) ?? String(g.gopId),
    entryCount: g._count.id,
  }));

  return NextResponse.json(sessions);
}
