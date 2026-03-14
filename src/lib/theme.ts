// Generates CSS custom property values from club colors
export function buildThemeVars(club: {
  farbe1: string;
  farbe2: string;
  farbe3: string;
  mono: boolean;
  bgColor: string;
}): Record<string, string> {
  return {
    '--color-primary': `#${club.farbe1}`,
    '--color-secondary': `#${club.farbe2}`,
    '--color-accent': `#${club.farbe3}`,
    '--color-bg': `#${club.bgColor}`,
  };
}

// Converts hex string (without #) to CSS hex
export function hexToCSS(hex: string): string {
  return `#${hex.replace('#', '')}`;
}
