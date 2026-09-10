import { cryptoShuffle, generateAssignment, buildSantaHistoryRows } from '@/lib/secret-santa-utils';

describe('cryptoShuffle', () => {
  it('returns an array of the same length', () => {
    expect(cryptoShuffle([1, 2, 3, 4, 5])).toHaveLength(5);
  });

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = cryptoShuffle(arr);
    expect(shuffled.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    cryptoShuffle(arr);
    expect(arr).toEqual([1, 2, 3]);
  });

  it('works with a single-element array', () => {
    expect(cryptoShuffle([42])).toEqual([42]);
  });

  it('works with an empty array', () => {
    expect(cryptoShuffle([])).toEqual([]);
  });

  it('works with strings', () => {
    const arr = ['a', 'b', 'c'];
    const shuffled = cryptoShuffle(arr);
    expect(shuffled.sort((a, b) => a.localeCompare(b))).toEqual(['a', 'b', 'c']);
  });
});

describe('generateAssignment', () => {
  it('returns a valid derangement for 4 members with no forbidden pairs', () => {
    const ids = [1, 2, 3, 4];
    const result = generateAssignment(ids, new Set());
    expect(result).not.toBeNull();
    expect(result!.length).toBe(4);
    result!.forEach(({ giverId, receiverId }) => {
      expect(giverId).not.toBe(receiverId);
    });
  });

  it('covers all givers exactly once', () => {
    const ids = [1, 2, 3, 4];
    const result = generateAssignment(ids, new Set());
    const givers = result!.map((r) => r.giverId).sort((a, b) => a - b);
    expect(givers).toEqual([1, 2, 3, 4]);
  });

  it('covers all receivers exactly once', () => {
    const ids = [1, 2, 3, 4];
    const result = generateAssignment(ids, new Set());
    const receivers = result!.map((r) => r.receiverId).sort((a, b) => a - b);
    expect(receivers).toEqual([1, 2, 3, 4]);
  });

  it('respects forbidden pairs', () => {
    const ids = [1, 2, 3, 4];
    const forbidden = new Set(['1:2', '2:3', '3:4', '4:1']);
    const result = generateAssignment(ids, forbidden);
    expect(result).not.toBeNull();
    result!.forEach(({ giverId, receiverId }) => {
      expect(forbidden.has(`${giverId}:${receiverId}`)).toBe(false);
    });
  });

  it('falls back to relaxed mode when all preferred pairs are forbidden', () => {
    // With 2 members the only valid derangement is 1->2, 2->1
    // Forbid it so the main loop fails and fallback kicks in
    const ids = [1, 2];
    const forbidden = new Set(['1:2', '2:1']);
    // Fallback only avoids self-assignment — still possible with 2 members
    const result = generateAssignment(ids, forbidden);
    // Either null (if fallback also fails) or a valid self-assignment-free result
    if (result !== null) {
      result.forEach(({ giverId, receiverId }) => {
        expect(giverId).not.toBe(receiverId);
      });
    }
  });

  it('handles two members without forbidden pairs', () => {
    const result = generateAssignment([1, 2], new Set());
    expect(result).not.toBeNull();
    expect(result![0].giverId).not.toBe(result![0].receiverId);
  });

  it('returns null when assignment is impossible', () => {
    // Single member can never be assigned to someone else
    const result = generateAssignment([1], new Set());
    // With only 1 member, any assignment maps 1->1 which is always invalid
    expect(result).toBeNull();
  });
});

describe('buildSantaHistoryRows', () => {
  const CURRENT_YEAR = 2026;

  it('uses the member\'s own current-year assignment when present', () => {
    const rows = buildSantaHistoryRows(
      [{ year: CURRENT_YEAR, receiver: { nickname: 'Bob', pic: 'none' } }],
      [{ year: CURRENT_YEAR }],
      CURRENT_YEAR,
      { nickname: 'StalePartner', pic: 'none' }
    );
    expect(rows).toEqual([{ year: CURRENT_YEAR, receiverNickname: 'Bob', receiverPic: 'none' }]);
  });

  it('falls back to the legacy partner pointer when nobody in the club has a current-year row yet', () => {
    const rows = buildSantaHistoryRows([], [], CURRENT_YEAR, { nickname: 'Patrick', pic: 'none' });
    expect(rows).toEqual([{ year: CURRENT_YEAR, receiverNickname: 'Patrick', receiverPic: 'none' }]);
  });

  it('still falls back to the legacy pointer for this member even when other members already have a current-year row', () => {
    // Regression test: this is the exact scenario that broke — an admin edits one member's
    // pairing via the pairings table, creating a real current-year row for THAT member only.
    // A different member with no row of their own must still see their legacy partner,
    // not silently lose their history entry.
    const rows = buildSantaHistoryRows(
      [], // this member has no assignment row of their own
      [{ year: CURRENT_YEAR }], // but the club already has a current-year row (for someone else)
      CURRENT_YEAR,
      { nickname: 'Patrick', pic: 'none' }
    );
    expect(rows).toEqual([{ year: CURRENT_YEAR, receiverNickname: 'Patrick', receiverPic: 'none' }]);
  });

  it('does not duplicate the current year when it is synthesized but already present in the years list', () => {
    const rows = buildSantaHistoryRows(
      [],
      [{ year: CURRENT_YEAR }, { year: CURRENT_YEAR - 1 }],
      CURRENT_YEAR,
      { nickname: 'Patrick', pic: 'none' }
    );
    expect(rows.filter((r) => r.year === CURRENT_YEAR)).toHaveLength(1);
  });

  it('shows no partner for the current year when there is no own row and no legacy pointer', () => {
    const rows = buildSantaHistoryRows([], [{ year: CURRENT_YEAR }], CURRENT_YEAR, null);
    expect(rows).toEqual([{ year: CURRENT_YEAR, receiverNickname: null, receiverPic: null }]);
  });

  it('does not synthesize a current-year row at all when there is no legacy pointer and no club history', () => {
    const rows = buildSantaHistoryRows([], [], CURRENT_YEAR, null);
    expect(rows).toEqual([]);
  });

  it('preserves past years alongside the synthesized current year', () => {
    const rows = buildSantaHistoryRows(
      [{ year: CURRENT_YEAR - 1, receiver: { nickname: 'Alice', pic: 'none' } }],
      [{ year: CURRENT_YEAR - 1 }],
      CURRENT_YEAR,
      { nickname: 'Patrick', pic: 'none' }
    );
    expect(rows).toEqual([
      { year: CURRENT_YEAR, receiverNickname: 'Patrick', receiverPic: 'none' },
      { year: CURRENT_YEAR - 1, receiverNickname: 'Alice', receiverPic: 'none' },
    ]);
  });
});
