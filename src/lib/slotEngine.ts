export type SymbolKey = 'book' | 'pin' | 'trophy' | 'target' | 'joker' | 'clover' | 'star' | 'bell' | 'slot' | 'dice';

export const SYMBOL_KEYS: SymbolKey[] = ['pin', 'trophy', 'book', 'target', 'joker', 'clover', 'star', 'bell', 'slot', 'dice'];

// Appearance weights per reel cell — rarer symbols pay more
const WEIGHTS: Record<SymbolKey, number> = {
  pin:    3,
  trophy: 5,
  book:   3,
  target: 6,
  joker:  6,
  clover: 8,
  star:   8,
  bell:   13,  // slightly higher to dilute book's relative share → target ~94% RTP
  slot:   13,  // same
  dice:   12,
};

// Multipliers for 3×, 4×, 5× consecutive matches (× bet per line)
const PAYOUTS: Record<SymbolKey, [number, number, number]> = {
  pin:    [ 80,  800, 4000], // Explorer — top symbol
  trophy: [ 32,  320, 1600], // Pharaoh
  book:   [ 14,  144, 1440], // Wild + Scatter
  target: [ 24,   80,  600], // God Horus
  joker:  [ 24,   80,  600], // Scarab
  clover: [  4,   32,  120], // Ace / King
  star:   [  4,   32,  120], // Ace / King
  bell:   [  4,   20,   80], // 10
  slot:   [  4,   20,   80], // Jack
  dice:   [  4,   20,   80], // Queen
};

// Separate multipliers for expanding-symbol scatter wins during free spins.
const SCATTER_PAYOUTS: Partial<Record<SymbolKey, [number, number, number]>> = {
  //              min   min+1  min+2+
  pin:    [  8,   26,    52 ],  // high-value, min 2 reels
  trophy: [  5,   13,    26 ],  // high-value, min 2 reels
  target: [  3,    8,    13 ],  // high-value, min 2 reels
  joker:  [  3,    8,    13 ],  // high-value, min 2 reels
  clover: [  3,    8,    13 ],  // low-value,  min 3 reels
  star:   [  3,    8,    13 ],  // low-value,  min 3 reels
  bell:   [  3,    5,    10 ],  // low-value,  min 3 reels
  slot:   [  3,    5,    10 ],  // low-value,  min 3 reels
  dice:   [  3,    5,    10 ],  // low-value,  min 3 reels
};

// 10 paylines for a 5×3 grid (row index per reel: 0=top, 1=mid, 2=bottom)
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [2, 1, 1, 1, 0],
];

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export function weightedRandomSymbol(): SymbolKey {
  let rand = secureRandom() * TOTAL_WEIGHT;
  for (const sym of SYMBOL_KEYS) {
    rand -= WEIGHTS[sym];
    if (rand <= 0) return sym;
  }
  return SYMBOL_KEYS.at(-1)!;
}

export function generateReels(): SymbolKey[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => weightedRandomSymbol()),
  );
}

export function evaluatePayline(
  reels: SymbolKey[][],
  lineIndex: number,
  betPerLine: number,
  skipSymbol?: SymbolKey,
): number {
  const payline = PAYLINES[lineIndex];
  const lineSymbols = payline.map((row, reel) => reels[reel][row]);
  const anchor = lineSymbols.find((s) => s !== 'book') ?? 'book';

  if (skipSymbol && anchor === skipSymbol) return 0;

  let count = 0;
  for (const sym of lineSymbols) {
    if (sym === anchor || sym === 'book') count++;
    else break;
  }

  if (count < 3) return 0;
  return PAYOUTS[anchor][count - 3] * betPerLine;
}

function evaluateExpandingScatter(reels: SymbolKey[][], sym: SymbolKey, betPerLine: number, lines: number): number {
  const count = reels.filter((reel) => reel.includes(sym)).length;
  // High-value symbols expand at ≥2 reels and pay scatter from that point.
  // Low-value symbols require ≥3 reels. payoutIdx maps into the [3×,4×,5×] table,
  // clamped so 5-reel always uses the highest multiplier.
  const minCount = HIGH_VALUE_SYMBOLS.has(sym) ? 2 : 3;
  if (count < minCount) return 0;
  const payoutIdx = Math.min(count - minCount, 2);
  const scatterTable = SCATTER_PAYOUTS[sym] ?? PAYOUTS[sym];
  return scatterTable[payoutIdx] * betPerLine * lines;
}

export function countScatters(reels: SymbolKey[][]): number {
  return reels.flat().filter((s) => s === 'book').length;
}

// High-value symbols need 2+ anywhere on screen to expand; low-value need 3+.
const HIGH_VALUE_SYMBOLS = new Set<SymbolKey>(['pin', 'trophy', 'target', 'joker']);

function applyExpansion(reels: SymbolKey[][], sym: SymbolKey): SymbolKey[][] {
  return reels.map((reel) =>
    reel.includes(sym) ? [sym, sym, sym] : reel,
  );
}

export interface SpinResult {
  reels: SymbolKey[][];
  originalReels: SymbolKey[][];
  win: number;
  featureTriggered: boolean;
  expansionApplied: boolean;
  expandingSymbol?: SymbolKey;
}

export function spin(lines: number, betPerLine: number, expandingSymbol?: SymbolKey): SpinResult {
  const originalReels = generateReels();
  let reels = originalReels;
  let expansionApplied = false;

  if (expandingSymbol) {
    const reelCount = originalReels.filter((reel) => reel.includes(expandingSymbol)).length;
    const threshold = HIGH_VALUE_SYMBOLS.has(expandingSymbol) ? 2 : 3;
    if (reelCount >= threshold) {
      reels = applyExpansion(originalReels, expandingSymbol);
      expansionApplied = true;
    }
  }

  let win = 0;
  if (expandingSymbol) {
    // Expanding symbol always pays scatter-style: count reels containing the symbol,
    // no adjacency or payline required. evaluateExpandingScatter handles the ≥ 3 reel
    // threshold for payment; expansion trigger threshold (≥ 2 for high-value) is separate.
    const scatterWin = evaluateExpandingScatter(reels, expandingSymbol, betPerLine, lines);
    win += scatterWin;
    // Skip expanding symbol in line wins only when scatter already covers it.
    // When scatter pays nothing (e.g. high-value 2-reel expansion), allow paylines
    // to evaluate the symbol so the expanded positions can still yield line wins.
    const skipSym = scatterWin > 0 ? expandingSymbol : undefined;
    for (let i = 0; i < lines; i++) {
      win += evaluatePayline(reels, i, betPerLine, skipSym);
    }
  } else {
    for (let i = 0; i < lines; i++) {
      win += evaluatePayline(reels, i, betPerLine);
    }
  }

  // Count scatters on original reels — expansion overwrites book symbols on expanded reels,
  // but a scatter that landed should still trigger/retrigger free spins.
  const featureTriggered = countScatters(originalReels) >= 3;
  const newExpandingSymbol: SymbolKey | undefined = featureTriggered
    ? SYMBOL_KEYS.filter((s) => s !== 'book')[Math.floor(secureRandom() * (SYMBOL_KEYS.length - 1))]
    : undefined;

  return { reels, originalReels, win, featureTriggered, expansionApplied, expandingSymbol: newExpandingSymbol };
}
