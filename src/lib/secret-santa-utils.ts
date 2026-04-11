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
