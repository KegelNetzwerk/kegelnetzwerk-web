import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

// GET /api/results/sessions?from=&to=
// Returns one row per sessionGroup (not per gopId).
export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where = {
    clubId: member.clubId,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
  };

  const [sessionGroups, categoryPairs] = await Promise.all([
    prisma.result.groupBy({
      by: ['sessionGroup'],
      where,
      _min: { date: true },
      _count: { id: true },
      orderBy: { _min: { date: 'desc' } },
    }),
    prisma.result.groupBy({
      by: ['sessionGroup', 'gopId'],
      where,
    }),
  ]);

  const gopIds = [...new Set(categoryPairs.map((p) => p.gopId))];
  const gops = await prisma.gameOrPenalty.findMany({
    where: { id: { in: gopIds } },
    select: { id: true, name: true },
  });
  const gopMap = new Map(gops.map((g) => [g.id, g.name]));

  const categoryNamesBySg = new Map<number, string[]>();
  for (const pair of categoryPairs) {
    const name = gopMap.get(pair.gopId) ?? String(pair.gopId);
    if (!categoryNamesBySg.has(pair.sessionGroup)) {
      categoryNamesBySg.set(pair.sessionGroup, []);
    }
    categoryNamesBySg.get(pair.sessionGroup)!.push(name);
  }

  return NextResponse.json(
    sessionGroups.map((s) => ({
      sessionGroup: s.sessionGroup,
      date: s._min.date!.toISOString(),
      categoryNames: (categoryNamesBySg.get(s.sessionGroup) ?? []).sort((a, b) =>
        a.localeCompare(b),
      ),
      entryCount: s._count.id,
    })),
  );
}
