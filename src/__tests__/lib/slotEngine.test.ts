import {
  SYMBOL_KEYS,
  PAYLINES,
  weightedRandomSymbol,
  generateReels,
  evaluatePayline,
  countScatters,
  spin,
} from '@/lib/slotEngine';
import type { SymbolKey } from '@/lib/slotEngine';

// Build 5 reels where the middle row (row 1) of each reel is the given symbol sequence.
function makeMiddleRowReels(midSymbols: SymbolKey[]): SymbolKey[][] {
  return midSymbols.map((sym) => ['bell', sym, 'bell'] as SymbolKey[]);
}

describe('SYMBOL_KEYS', () => {
  it('has 10 entries', () => expect(SYMBOL_KEYS).toHaveLength(10));
  it('contains book', () => expect(SYMBOL_KEYS).toContain('book'));
});

describe('PAYLINES', () => {
  it('has 10 paylines', () => expect(PAYLINES).toHaveLength(10));
  it('each payline has 5 entries within [0, 2]', () => {
    for (const line of PAYLINES) {
      expect(line).toHaveLength(5);
      for (const row of line) {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('weightedRandomSymbol', () => {
  it('always returns a valid SymbolKey', () => {
    for (let i = 0; i < 100; i++) {
      expect(SYMBOL_KEYS).toContain(weightedRandomSymbol());
    }
  });
});

describe('generateReels', () => {
  it('returns 5 reels of 3 valid symbols each', () => {
    const reels = generateReels();
    expect(reels).toHaveLength(5);
    for (const reel of reels) {
      expect(reel).toHaveLength(3);
      for (const sym of reel) {
        expect(SYMBOL_KEYS).toContain(sym);
      }
    }
  });
});

describe('countScatters', () => {
  it('returns 0 when no books present', () => {
    const reels = Array.from({ length: 5 }, () => ['pin', 'pin', 'pin'] as SymbolKey[]);
    expect(countScatters(reels)).toBe(0);
  });

  it('counts books across all reels and rows', () => {
    const reels: SymbolKey[][] = [
      ['book', 'pin', 'pin'],
      ['pin', 'book', 'pin'],
      ['pin', 'pin', 'book'],
      ['pin', 'pin', 'pin'],
      ['pin', 'pin', 'pin'],
    ];
    expect(countScatters(reels)).toBe(3);
  });

  it('counts multiple books per reel', () => {
    const reels: SymbolKey[][] = [
      ['book', 'book', 'book'],
      ['pin', 'pin', 'pin'],
      ['pin', 'pin', 'pin'],
      ['pin', 'pin', 'pin'],
      ['pin', 'pin', 'pin'],
    ];
    expect(countScatters(reels)).toBe(3);
  });
});

// PAYLINES[0] = [1,1,1,1,1] (all middle row)
// PAYLINES[1] = [0,0,0,0,0] (all top row)
describe('evaluatePayline', () => {
  it('returns 0 for fewer than 3 consecutive matches', () => {
    const reels = makeMiddleRowReels(['pin', 'pin', 'star', 'star', 'star']);
    expect(evaluatePayline(reels, 0, 1)).toBe(0);
  });

  it('pays for exactly 3 consecutive matches (PAYOUTS[pin][0] = 80)', () => {
    const reels = makeMiddleRowReels(['pin', 'pin', 'pin', 'star', 'star']);
    expect(evaluatePayline(reels, 0, 1)).toBe(80);
  });

  it('pays for 4 consecutive matches (PAYOUTS[pin][1] = 800)', () => {
    const reels = makeMiddleRowReels(['pin', 'pin', 'pin', 'pin', 'star']);
    expect(evaluatePayline(reels, 0, 1)).toBe(800);
  });

  it('pays for 5 consecutive matches (PAYOUTS[pin][2] = 4000)', () => {
    const reels = makeMiddleRowReels(['pin', 'pin', 'pin', 'pin', 'pin']);
    expect(evaluatePayline(reels, 0, 1)).toBe(4000);
  });

  it('scales win by betPerLine', () => {
    const reels = makeMiddleRowReels(['pin', 'pin', 'pin', 'star', 'star']);
    expect(evaluatePayline(reels, 0, 5)).toBe(400); // 80 * 5
  });

  it('treats leading book as wild (anchor = first non-book)', () => {
    // [book, pin, pin, pin, star] → anchor=pin, count=4 → PAYOUTS['pin'][1]=800
    const reels = makeMiddleRowReels(['book', 'pin', 'pin', 'pin', 'star']);
    expect(evaluatePayline(reels, 0, 1)).toBe(800);
  });

  it('treats mid-sequence book as wild', () => {
    // [pin, book, pin, star, star] → anchor=pin, count=3 → PAYOUTS['pin'][0]=80
    const reels = makeMiddleRowReels(['pin', 'book', 'pin', 'star', 'star']);
    expect(evaluatePayline(reels, 0, 1)).toBe(80);
  });

  it('handles all-book payline — anchor falls back to book (PAYOUTS[book][2] = 1440)', () => {
    // All 5 symbols are 'book' → find() returns undefined → anchor = 'book'
    const reels = makeMiddleRowReels(['book', 'book', 'book', 'book', 'book']);
    expect(evaluatePayline(reels, 0, 1)).toBe(1440); // PAYOUTS['book'][2]
  });

  it('returns 0 when anchor matches skipSymbol', () => {
    const reels = makeMiddleRowReels(['pin', 'pin', 'pin', 'star', 'star']);
    expect(evaluatePayline(reels, 0, 1, 'pin')).toBe(0);
  });

  it('evaluates non-zero lineIndex correctly (line 1 = top row)', () => {
    // PAYLINES[1] = [0,0,0,0,0] — top row of each reel
    const reels: SymbolKey[][] = [
      ['trophy', 'bell', 'bell'],
      ['trophy', 'bell', 'bell'],
      ['trophy', 'bell', 'bell'],
      ['star', 'bell', 'bell'],
      ['star', 'bell', 'bell'],
    ];
    expect(evaluatePayline(reels, 1, 1)).toBe(32); // PAYOUTS['trophy'][0] = 32
  });

  it('does not skip non-matching skipSymbol', () => {
    const reels = makeMiddleRowReels(['pin', 'pin', 'pin', 'star', 'star']);
    expect(evaluatePayline(reels, 0, 1, 'trophy')).toBe(80);
  });
});

describe('spin', () => {
  it('returns SpinResult with correct shape', () => {
    const result = spin(10, 1);
    expect(result).toHaveProperty('reels');
    expect(result).toHaveProperty('originalReels');
    expect(result).toHaveProperty('win');
    expect(result).toHaveProperty('featureTriggered');
    expect(result).toHaveProperty('expansionApplied');
    expect(result.reels).toHaveLength(5);
    expect(typeof result.win).toBe('number');
  });

  it('win is always non-negative', () => {
    for (let i = 0; i < 20; i++) {
      expect(spin(10, 1).win).toBeGreaterThanOrEqual(0);
    }
  });

  it('featureTriggered matches 3+ books in originalReels', () => {
    for (let i = 0; i < 50; i++) {
      const { featureTriggered, originalReels } = spin(10, 1);
      const books = originalReels.flat().filter((s) => s === 'book').length;
      expect(featureTriggered).toBe(books >= 3);
    }
  });

  it('expansionApplied is false without expandingSymbol', () => {
    for (let i = 0; i < 20; i++) {
      expect(spin(10, 1).expansionApplied).toBe(false);
    }
  });

  it('with high-value expandingSymbol — expansionApplied is consistent with reel count', () => {
    for (let i = 0; i < 100; i++) {
      const result = spin(10, 1, 'pin'); // 'pin' is high-value, threshold = 2
      const reelCount = result.originalReels.filter((r) => r.includes('pin')).length;
      if (result.expansionApplied) {
        expect(reelCount).toBeGreaterThanOrEqual(2);
        // Expanded reels with 'pin' should be all-pin
        result.reels.forEach((reel, idx) => {
          if (result.originalReels[idx].includes('pin')) {
            expect(reel).toEqual(['pin', 'pin', 'pin']);
          }
        });
      } else {
        expect(reelCount).toBeLessThan(2);
      }
    }
  });

  it('with low-value expandingSymbol — threshold is 3 reels', () => {
    for (let i = 0; i < 100; i++) {
      const result = spin(10, 1, 'bell'); // 'bell' is low-value, threshold = 3
      const reelCount = result.originalReels.filter((r) => r.includes('bell')).length;
      if (result.expansionApplied) {
        expect(reelCount).toBeGreaterThanOrEqual(3);
      } else {
        expect(reelCount).toBeLessThan(3);
      }
    }
  });

  it('single line bet is honoured', () => {
    const result = spin(1, 1);
    expect(result.win).toBeGreaterThanOrEqual(0);
  });
});
