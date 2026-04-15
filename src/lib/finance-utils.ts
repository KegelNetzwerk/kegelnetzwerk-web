import { prisma } from '@/lib/prisma';

/** Adds `sessionDate` (ISO string) to each SESSION_PAYMENT transaction by looking up
 *  the earliest Result date for that sessionGroup. Non-SESSION_PAYMENT rows get null. */
export async function enrichWithSessionDates<T extends { type: string; sessionGroup: number | null }>(
  transactions: T[],
  clubId: number,
): Promise<(T & { sessionDate: string | null })[]> {
  const sessionGroups = [
    ...new Set(
      transactions
        .filter((tx) => tx.type === 'SESSION_PAYMENT' && tx.sessionGroup !== null)
        .map((tx) => tx.sessionGroup as number),
    ),
  ];

  const sessionDateMap: Record<number, string> = {};
  if (sessionGroups.length > 0) {
    const sessionDates = await prisma.result.groupBy({
      by: ['sessionGroup'],
      where: { clubId, sessionGroup: { in: sessionGroups } },
      _min: { date: true },
    });
    for (const s of sessionDates) {
      if (s._min.date) sessionDateMap[s.sessionGroup] = s._min.date.toISOString();
    }
  }

  return transactions.map((tx) => ({
    ...tx,
    sessionDate: tx.sessionGroup !== null ? (sessionDateMap[tx.sessionGroup] ?? null) : null,
  }));
}

/** Returns the `where.date` filter fragment for payoff queries bounded by fromDate..toDate. */
export function buildPayoffDateFilter(fromDate: Date | null, toDate: Date) {
  return fromDate ? { date: { gte: fromDate, lt: toDate } } : { date: { lt: toDate } };
}
