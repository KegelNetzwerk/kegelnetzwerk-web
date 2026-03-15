import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Unit } from '@prisma/client';

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get('from') ?? Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = new Date(searchParams.get('to') ?? Date.now());
  const unit = (searchParams.get('unit') ?? 'POINTS') as Unit;
  const gopId = searchParams.get('gopId');
  const eliLowest = parseInt(searchParams.get('eliLowest') ?? '0', 10);
  const eliHighest = parseInt(searchParams.get('eliHighest') ?? '0', 10);
  const sortAsc = searchParams.get('sort') === 'asc';

  // Build result filter
  const resultWhere = {
    clubId: member.clubId,
    date: { gte: from, lte: to },
    part: { unit },
    ...(gopId ? { gopId: parseInt(gopId, 10) } : {}),
  };

  // Fetch all members of the club
  const members = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { id: true, nickname: true },
  });

  // Fetch all sessions (unique sessionGroup values in date range)
  const sessions = await prisma.result.findMany({
    where: resultWhere,
    select: { sessionGroup: true, date: true },
    distinct: ['sessionGroup'],
    orderBy: { sessionGroup: 'asc' },
  });

  // Fetch all results
  const allResults = await prisma.result.findMany({
    where: resultWhere,
    include: { part: { select: { name: true, unit: true } } },
  });

  // Build per-member aggregations
  const memberData = members.map((m) => {
    const memberResults = allResults.filter((r) => r.memberId === m.id);

    // Group by session
    const sessionMap = new Map<number, number>();
    for (const r of memberResults) {
      const current = sessionMap.get(r.sessionGroup) ?? 0;
      sessionMap.set(r.sessionGroup, current + r.value);
    }

    // Actual results per session
    const sessionValues = Array.from(sessionMap.entries()).map(([sg, val]) => ({
      sessionGroup: sg,
      value: val,
      missed: false,
    }));

    // Pad with zero for every session the member missed — zeros compete in elimination
    const attendedGroups = new Set(sessionMap.keys());
    for (const s of sessions) {
      if (!attendedGroups.has(s.sessionGroup)) {
        sessionValues.push({ sessionGroup: s.sessionGroup, value: 0, missed: true });
      }
    }

    // Elimination (operates on all sessions including zeros for missed ones)
    let includedSessions = [...sessionValues];
    if (eliLowest > 0) {
      const sorted = [...includedSessions].sort((a, b) => a.value - b.value);
      const toExclude = sorted.slice(0, eliLowest).map((s) => s.sessionGroup);
      includedSessions = includedSessions.filter((s) => !toExclude.includes(s.sessionGroup));
    }
    if (eliHighest > 0) {
      const sorted = [...includedSessions].sort((a, b) => b.value - a.value);
      const toExclude = sorted.slice(0, eliHighest).map((s) => s.sessionGroup);
      includedSessions = includedSessions.filter((s) => !toExclude.includes(s.sessionGroup));
    }

    const total = includedSessions.reduce((sum, s) => sum + s.value, 0);
    const rawTotal = sessionValues.reduce((sum, s) => sum + s.value, 0);

    const includedGroups = new Set(includedSessions.map((s) => s.sessionGroup));

    return {
      id: m.id,
      nickname: m.nickname,
      total,
      rawTotal,
      sessions: sessionValues.map((s) => ({
        sessionGroup: s.sessionGroup,
        value: s.value,
        excluded: !includedGroups.has(s.sessionGroup),
        missed: s.missed,
      })),
    };
  });

  // Filter out members with no results and sort
  const withResults = memberData.filter((m) => m.total !== 0 || m.sessions.length > 0);
  withResults.sort((a, b) => sortAsc ? a.total - b.total : b.total - a.total);

  // Parts breakdown
  const parts = await prisma.part.findMany({
    where: {
      clubId: member.clubId,
      unit,
      ...(gopId ? { gameOrPenaltyId: parseInt(gopId, 10) } : {}),
    },
    select: { id: true, name: true, unit: true },
  });

  const partsBreakdown = parts.map((part) => {
    const partResults = allResults.filter((r) => r.partId === part.id);
    const partMemberData = members.map((m) => {
      const total = partResults
        .filter((r) => r.memberId === m.id)
        .reduce((sum, r) => sum + r.value, 0);
      return { nickname: m.nickname, total };
    }).filter((m) => m.total !== 0);

    partMemberData.sort((a, b) => sortAsc ? a.total - b.total : b.total - a.total);
    return { id: part.id, name: part.name, unit: part.unit, members: partMemberData };
  });

  return NextResponse.json({
    members: withResults,
    sessions: sessions.map((s) => ({ sessionGroup: s.sessionGroup, date: s.date.toISOString() })),
    partsBreakdown,
    unit,
  });
}
