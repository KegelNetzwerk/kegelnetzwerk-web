import { Resvg } from '@resvg/resvg-js';
import { KEGEL_W, KEGEL_H, KEGEL_R, KEGEL_PINS } from './kegelPins';

export interface KegelOptions {
  /** Hex without '#' — fill colour for active pins. */
  color: string;
  /** Hex without '#' — stroke colour for all pin borders (defaults to color). */
  strokeColor?: string;
  /** 1-based pin numbers that should be filled (default: none). */
  activePins?: number[];
}

function buildKegelSvg({ color, strokeColor, activePins = [] }: KegelOptions): string {
  const c = /^[0-9a-fA-F]{6}$/.test(color) ? color : '1e6091';
  const s = strokeColor && /^[0-9a-fA-F]{6}$/.test(strokeColor) ? strokeColor : c;

  const pinsSvg = KEGEL_PINS.map(([x, y], idx) => {
    const isActive = activePins.includes(idx + 1);
    return `<circle cx="${x}" cy="${y}" r="${KEGEL_R}" fill="${isActive ? `#${c}` : 'none'}" stroke="#${s}" stroke-width="1.5"/>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${KEGEL_W}" height="${KEGEL_H}" viewBox="0 0 ${KEGEL_W} ${KEGEL_H}">
  ${pinsSvg}
</svg>`;
}

export async function buildKegelPng(opts: KegelOptions): Promise<Buffer> {
  const svg = buildKegelSvg(opts);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: KEGEL_W },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
