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
  const eliLowest = Number.parseInt(searchParams.get('eliLowest') ?? '0', 10);
  const eliHighest = Number.parseInt(searchParams.get('eliHighest') ?? '0', 10);
  const sortAsc = searchParams.get('sort') === 'asc';
  // 'members' (default) | 'both' | 'guests'
  const participantMode = searchParams.get('participantMode') ?? 'members';
  const includeMembers = participantMode !== 'guests';
  const includeGuests = participantMode === 'both' || participantMode === 'guests';

  // Build result filter — sessions are determined from all results (members + guests)
  const baseResultWhere = {
    clubId: member.clubId,
    date: { gte: from, lte: to },
    part: { unit },
    ...(gopId ? { gopId: Number.parseInt(gopId, 10) } : {}),
  };

  // Fetch all sessions (unique sessionGroup values in date range, across members and guests)
  const sessions = await prisma.result.findMany({
    where: baseResultWhere,
    select: { sessionGroup: true, date: true },
    distinct: ['sessionGroup'],
    orderBy: { sessionGroup: 'asc' },
  });

  // Fetch all results
  const allResults = await prisma.result.findMany({
    where: baseResultWhere,
    include: { part: { select: { name: true, unit: true } } },
  });

  /** Shared helper: build per-participant session aggregation with elimination */
  function buildParticipantData(
    participantId: number,
    participantResults: typeof allResults,
    padMissedSessions: boolean,
  ) {
    const sessionMap = new Map<number, number>();
    for (const r of participantResults) {
      sessionMap.set(r.sessionGroup, (sessionMap.get(r.sessionGroup) ?? 0) + r.value);
    }

    const sessionValues = Array.from(sessionMap.entries()).map(([sg, val]) => ({
      sessionGroup: sg,
      value: val,
      missed: false,
    }));

    if (padMissedSessions) {
      const attendedGroups = new Set(sessionMap.keys());
      for (const s of sessions) {
        if (!attendedGroups.has(s.sessionGroup)) {
          sessionValues.push({ sessionGroup: s.sessionGroup, value: 0, missed: true });
        }
      }
    }

    let includedSessions = [...sessionValues];
    if (eliLowest > 0) {
      const sorted = [...includedSessions].sort((a, b) => a.value - b.value);
      const toExclude = new Set(sorted.slice(0, eliLowest).map((s) => s.sessionGroup));
      includedSessions = includedSessions.filter((s) => !toExclude.has(s.sessionGroup));
    }
    if (eliHighest > 0) {
      const sorted = [...includedSessions].sort((a, b) => b.value - a.value);
      const toExclude = new Set(sorted.slice(0, eliHighest).map((s) => s.sessionGroup));
      includedSessions = includedSessions.filter((s) => !toExclude.has(s.sessionGroup));
    }

    const includedGroups = new Set(includedSessions.map((s) => s.sessionGroup));
    const total = includedSessions.reduce((sum, s) => sum + s.value, 0);
    const rawTotal = sessionValues.reduce((sum, s) => sum + s.value, 0);

    return {
      id: participantId,
      total,
      rawTotal,
      sessions: sessionValues.map((s) => ({
        sessionGroup: s.sessionGroup,
        value: s.value,
        excluded: !includedGroups.has(s.sessionGroup),
        missed: s.missed,
      })),
    };
  }

  // ── Member aggregation ──
  let withResults: Array<{ id: number; nickname: string; total: number; rawTotal: number; sessions: { sessionGroup: number; value: number; excluded: boolean; missed: boolean }[] }> = [];

  if (includeMembers) {
    const clubMembers = await prisma.member.findMany({
      where: { clubId: member.clubId },
      select: { id: true, nickname: true },
    });

    const memberResultsOnly = allResults.filter((r) => r.memberId !== null);
    const memberData = clubMembers.map((m) => {
      const data = buildParticipantData(m.id, memberResultsOnly.filter((r) => r.memberId === m.id), true);
      return { ...data, nickname: m.nickname };
    });

    const filtered = memberData.filter((m) => m.total !== 0 || m.sessions.some((s) => !s.missed));
    filtered.sort((a, b) => sortAsc ? a.total - b.total : b.total - a.total);
    withResults = filtered;
  }

  // ── Guest aggregation ──
  let guestResults: Array<{ id: number; nickname: string; total: number; rawTotal: number; sessions: { sessionGroup: number; value: number; excluded: boolean; missed: boolean }[] }> = [];

  if (includeGuests) {
    const clubGuests = await prisma.guest.findMany({
      where: { clubId: member.clubId },
      select: { id: true, nickname: true },
    });

    const guestResultsOnly = allResults.filter((r) => r.guestId !== null);
    const guestData = clubGuests.map((g) => {
      const data = buildParticipantData(g.id, guestResultsOnly.filter((r) => r.guestId === g.id), false);
      return { ...data, nickname: g.nickname };
    });

    const filtered = guestData.filter((g) => g.total !== 0 || g.sessions.length > 0);
    filtered.sort((a, b) => sortAsc ? a.total - b.total : b.total - a.total);
    guestResults = filtered;
  }

  // Parts breakdown
  const parts = await prisma.part.findMany({
    where: {
      clubId: member.clubId,
      unit,
      ...(gopId ? { gameOrPenaltyId: Number.parseInt(gopId, 10) } : {}),
    },
    select: { id: true, name: true, unit: true },
  });

  const partsBreakdown = parts.map((part) => {
    const partResults = allResults.filter((r) => r.partId === part.id);
    const partParticipants = [
      ...withResults.map((m) => ({
        nickname: m.nickname,
        total: partResults.filter((r) => r.memberId === m.id).reduce((sum, r) => sum + r.value, 0),
        isGuest: false,
      })),
      ...guestResults.map((g) => ({
        nickname: g.nickname,
        total: partResults.filter((r) => r.guestId === g.id).reduce((sum, r) => sum + r.value, 0),
        isGuest: true,
      })),
    ].filter((p) => p.total !== 0);

    partParticipants.sort((a, b) => sortAsc ? a.total - b.total : b.total - a.total);
    return { id: part.id, name: part.name, unit: part.unit, members: partParticipants };
  });

  return NextResponse.json({
    members: withResults,
    guests: guestResults,
    sessions: sessions.map((s) => ({ sessionGroup: s.sessionGroup, date: s.date.toISOString() })),
    partsBreakdown,
    unit,
  });
}
