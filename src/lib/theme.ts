export const BG1_IMAGES = [
  '/images/fullbg.jpg',
  '/images/fullbg_alt.jpg',
  '/images/fullbg_neutral.jpg',
];

export const BG2_STYLES = [
  "url('/images/bg.png') center/cover",
  "url('/images/bg_alt.png') center/cover",
  "url('/images/bg_light.png') center/cover",
];

export function getBg2Value(bg2: number, bgColor: string): string {
  if (bg2 === 3) return `#${bgColor}`;
  return BG2_STYLES[bg2] ?? BG2_STYLES[0];
}

// Generates CSS custom property values from club colors/backgrounds
export function buildThemeVars(club: {
  farbe1: string;
  farbe2: string;
  farbe3: string;
  mono: boolean;
  bgColor: string;
  bg1?: number;
  bg2?: number;
}): Record<string, string> {
  const bg1 = club.bg1 ?? 0;
  const bg2 = club.bg2 ?? 0;

  return {
    '--kn-primary':   `#${club.farbe1}`,
    '--kn-secondary': `#${club.farbe2}`,
    '--kn-accent':    `#${club.farbe3}`,
    '--kn-bg':        `#${club.bgColor}`,
    '--kn-bg1-url':   `url('${BG1_IMAGES[bg1] ?? BG1_IMAGES[0]}')`,
    '--kn-bg2':       getBg2Value(bg2, club.bgColor),
    '--color-primary':   `#${club.farbe1}`,
    '--color-secondary': `#${club.farbe2}`,
    '--color-accent':    `#${club.farbe3}`,
  };
}

export function hexToCSS(hex: string): string {
  return `#${hex.replace('#', '')}`;
}
