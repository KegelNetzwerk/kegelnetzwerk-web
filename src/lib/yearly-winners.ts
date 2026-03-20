import { prisma } from '@/lib/prisma';
import { Unit } from '@prisma/client';

export type YearRanking = { nickname: string; total: number };
export type YearlyWinnersEntry = { year: number; unit: string; rankings: YearRanking[] };

export async function computeYearlyWinners(
  clubId: number,
  defaultScoringFilter: string
): Promise<YearlyWinnersEntry[]> {
  const filterParams = new URLSearchParams(defaultScoringFilter ?? '');
  const filterUnit = (filterParams.get('unit') === 'EURO' ? 'EURO' : 'POINTS') as Unit;
  const filterGopId = filterParams.get('gopId') ? parseInt(filterParams.get('gopId')!) : null;
  const filterEliLowest = parseInt(filterParams.get('eliLowest') ?? '0', 10);
  const filterEliHighest = parseInt(filterParams.get('eliHighest') ?? '0', 10);

  const [clubMembers, allScoringResults] = await Promise.all([
    prisma.member.findMany({ where: { clubId }, select: { id: true, nickname: true } }),
    prisma.result.findMany({
      where: {
        clubId,
        part: { unit: filterUnit },
        ...(filterGopId ? { gopId: filterGopId } : {}),
      },
      select: { memberId: true, sessionGroup: true, value: true, date: true },
    }),
  ]);

  const yearlyWinners: YearlyWinnersEntry[] = [];
  if (allScoringResults.length === 0) return yearlyWinners;

  const minYear = Math.min(...allScoringResults.map((r) => r.date.getFullYear()));
  const maxYear = new Date().getFullYear();

  for (let year = maxYear; year >= minYear; year--) {
    const yearResults = allScoringResults.filter((r) => r.date.getFullYear() === year);
    if (yearResults.length === 0) continue;

    const sessionGroups = [...new Set(yearResults.map((r) => r.sessionGroup))];
    const rankings: YearRanking[] = [];

    for (const m of clubMembers) {
      const memberResults = yearResults.filter((r) => r.memberId === m.id);
      const sessionMap = new Map<number, number>();
      for (const r of memberResults) {
        sessionMap.set(r.sessionGroup, (sessionMap.get(r.sessionGroup) ?? 0) + r.value);
      }
      for (const sg of sessionGroups) {
        if (!sessionMap.has(sg)) sessionMap.set(sg, 0);
      }

      let sessionValues = Array.from(sessionMap.entries()).map(([sg, val]) => ({ sg, val }));
      if (filterEliLowest > 0) {
        const toExclude = new Set([...sessionValues].sort((a, b) => a.val - b.val).slice(0, filterEliLowest).map((s) => s.sg));
        sessionValues = sessionValues.filter((s) => !toExclude.has(s.sg));
      }
      if (filterEliHighest > 0) {
        const toExclude = new Set([...sessionValues].sort((a, b) => b.val - a.val).slice(0, filterEliHighest).map((s) => s.sg));
        sessionValues = sessionValues.filter((s) => !toExclude.has(s.sg));
      }

      const total = sessionValues.reduce((sum, s) => sum + s.val, 0);
      if (total > 0) rankings.push({ nickname: m.nickname, total });
    }

    if (rankings.length > 0) {
      rankings.sort((a, b) => b.total - a.total);
      yearlyWinners.push({ year, unit: filterUnit, rankings });
    }
  }

  return yearlyWinners;
}
