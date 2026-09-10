import { randomInt } from 'node:crypto';

/** Cryptographically secure Fisher-Yates shuffle. */
export function cryptoShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a derangement avoiding forbidden (giver→receiver) pairs.
 * Falls back relaxing constraints if needed.
 */
export function generateAssignment(
  ids: number[],
  forbidden: Set<string>
): { giverId: number; receiverId: number }[] | null {
  const n = ids.length;

  for (let attempt = 0; attempt < 2000; attempt++) {
    const shuffled = cryptoShuffle(ids);
    let valid = true;
    for (let i = 0; i < n; i++) {
      const giver = ids[i];
      const receiver = shuffled[i];
      if (giver === receiver || forbidden.has(`${giver}:${receiver}`)) {
        valid = false;
        break;
      }
    }
    if (valid) return ids.map((id, i) => ({ giverId: id, receiverId: shuffled[i] }));
  }

  // Fallback: only avoid self-assignment
  for (let attempt = 0; attempt < 1000; attempt++) {
    const shuffled = cryptoShuffle(ids);
    let valid = true;
    for (let i = 0; i < n; i++) {
      if (ids[i] === shuffled[i]) { valid = false; break; }
    }
    if (valid) return ids.map((id, i) => ({ giverId: id, receiverId: shuffled[i] }));
  }

  return null;
}

interface SantaPersonRef {
  nickname: string;
  pic: string;
}

interface SantaHistoryRow {
  year: number;
  receiver: SantaPersonRef;
}

export interface SantaRow {
  year: number;
  receiverNickname: string | null;
  receiverPic: string | null;
}

/**
 * Build a member's yearly Secret Santa history rows for display.
 *
 * `history` holds only this member's own SecretSantaAssignment rows; `years` holds the
 * distinct years for which the *club* has any assignment row (used to decide which years
 * get a row at all). If this member has no assignment row of their own for the current
 * year, fall back to their legacy `secretSantaPartnerId` pointer — but only per-member:
 * other members may already have a real current-year row (e.g. from an admin editing
 * individual pairings) while this member's own pairing hasn't been (re)drawn yet, and that
 * must not suppress this member's own fallback.
 */
export function buildSantaHistoryRows(
  history: SantaHistoryRow[],
  years: { year: number }[],
  currentYear: number,
  legacyPartner: SantaPersonRef | null
): SantaRow[] {
  const historyByYear = new Map(history.map((h) => [h.year, { nickname: h.receiver.nickname, pic: h.receiver.pic }]));
  const allYears = [...years];

  const hasOwnCurrentYearRow = historyByYear.has(currentYear);
  if (!hasOwnCurrentYearRow && legacyPartner) {
    if (!allYears.some(({ year }) => year === currentYear)) {
      allYears.unshift({ year: currentYear });
    }
    historyByYear.set(currentYear, { nickname: legacyPartner.nickname, pic: legacyPartner.pic });
  }

  return allYears.map(({ year }) => ({
    year,
    receiverNickname: historyByYear.get(year)?.nickname ?? null,
    receiverPic: historyByYear.get(year)?.pic ?? null,
  }));
}
