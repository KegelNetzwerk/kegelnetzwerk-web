/**
 * Shared Kegel pin geometry — safe to import client-side (no server deps).
 *
 * Layout (view from above, bowler stands at the bottom):
 *
 *        9           ← back
 *      7   8
 *    4   5   6       ← middle (widest row)
 *      2   3
 *        1           ← front
 *
 * The rhombus is deliberately stretched horizontally:
 * pin spread across = 2×hStep + 2×R = 156 px
 * pin spread down   = 4×vStep + 2×R = 124 px
 */

export const KEGEL_W = 200;
export const KEGEL_H = 150;
export const KEGEL_R = 10;

const cx = KEGEL_W / 2; // 100
const cy = KEGEL_H / 2; // 75
const hStep = 39;
const vStep = 26;

/**
 * Pin positions [x, y] indexed 0–8  →  pin numbers 1–9.
 * Order: front to back, left to right within each row.
 */
export const KEGEL_PINS: [number, number][] = [
  [cx,            cy + 2 * vStep], // 1 – front
  [cx - hStep,    cy +     vStep], // 2
  [cx + hStep,    cy +     vStep], // 3
  [cx - 2 * hStep, cy           ], // 4 – middle left
  [cx,             cy           ], // 5 – middle centre
  [cx + 2 * hStep, cy           ], // 6 – middle right
  [cx - hStep,    cy -     vStep], // 7
  [cx + hStep,    cy -     vStep], // 8
  [cx,            cy - 2 * vStep], // 9 – back
];
