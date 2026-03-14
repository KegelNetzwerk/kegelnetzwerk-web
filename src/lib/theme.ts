// Generates CSS custom property values from club colors
export function buildThemeVars(club: {
  farbe1: string;
  farbe2: string;
  farbe3: string;
  mono: boolean;
  bgColor: string;
}): Record<string, string> {
  return {
    // Tailwind-safe names (--kn-* avoids conflicts with Tailwind's @theme tokens)
    '--kn-primary':   `#${club.farbe1}`,
    '--kn-secondary': `#${club.farbe2}`,
    '--kn-accent':    `#${club.farbe3}`,
    '--kn-bg':        `#${club.bgColor}`,
    // Also set the old names for any components that still reference them
    '--color-primary':   `#${club.farbe1}`,
    '--color-secondary': `#${club.farbe2}`,
    '--color-accent':    `#${club.farbe3}`,
  };
}

// Converts hex string (without #) to CSS hex
export function hexToCSS(hex: string): string {
  return `#${hex.replace('#', '')}`;
}
