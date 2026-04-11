import { getBg2Value, buildThemeVars, hexToCSS, BG1_IMAGES, BG2_STYLES } from '@/lib/theme';

describe('getBg2Value', () => {
  it('returns hex color when bg2 is 3', () => {
    expect(getBg2Value(3, 'ff0000')).toBe('#ff0000');
  });

  it('returns first bg2 style for index 0', () => {
    expect(getBg2Value(0, 'ffffff')).toBe(BG2_STYLES[0]);
  });

  it('returns second bg2 style for index 1', () => {
    expect(getBg2Value(1, 'ffffff')).toBe(BG2_STYLES[1]);
  });

  it('returns third bg2 style for index 2', () => {
    expect(getBg2Value(2, 'ffffff')).toBe(BG2_STYLES[2]);
  });

  it('falls back to first style for out-of-range index', () => {
    expect(getBg2Value(99, 'ffffff')).toBe(BG2_STYLES[0]);
  });
});

describe('buildThemeVars', () => {
  const club = {
    farbe1: 'ff0000',
    farbe2: '00ff00',
    farbe3: '0000ff',
    mono: false,
    bgColor: 'ffffff',
    bg1: 0,
    bg2: 0,
  };

  it('sets CSS custom properties for primary, secondary, accent, bg', () => {
    const vars = buildThemeVars(club);
    expect(vars['--kn-primary']).toBe('#ff0000');
    expect(vars['--kn-secondary']).toBe('#00ff00');
    expect(vars['--kn-accent']).toBe('#0000ff');
    expect(vars['--kn-bg']).toBe('#ffffff');
  });

  it('sets --color-primary from farbe1', () => {
    const vars = buildThemeVars(club);
    expect(vars['--color-primary']).toBe('#ff0000');
  });

  it('sets bg1 url from BG1_IMAGES', () => {
    const vars = buildThemeVars(club);
    expect(vars['--kn-bg1-url']).toBe(`url('${BG1_IMAGES[0]}')`);
  });

  it('uses bg2 style when bg2 is 0', () => {
    const vars = buildThemeVars(club);
    expect(vars['--kn-bg2']).toBe(BG2_STYLES[0]);
  });

  it('uses hex color when bg2 is 3', () => {
    const vars = buildThemeVars({ ...club, bg2: 3 });
    expect(vars['--kn-bg2']).toBe('#ffffff');
  });

  it('defaults bg1 to 0 when not provided', () => {
    const { bg1: _bg1, bg2: _bg2, ...clubWithout } = club;
    const vars = buildThemeVars(clubWithout);
    expect(vars['--kn-bg1-url']).toBe(`url('${BG1_IMAGES[0]}')`);
  });
});

describe('hexToCSS', () => {
  it('prepends # to a bare hex string', () => {
    expect(hexToCSS('ff0000')).toBe('#ff0000');
  });

  it('does not double the # if already present', () => {
    expect(hexToCSS('#00ff00')).toBe('#00ff00');
  });
});
