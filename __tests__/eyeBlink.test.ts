import {
  blinkOpacity,
  blinkSourcesFor,
  HALF_CLOSED_OPACITY,
  resolveBases,
} from '../src/avatar/baseCatalogue';
import { BASES, getEyeSource } from '../src/avatar/registry';

const row = (over: any = {}) => ({
  key: 'new_base_1',
  slot: 'base' as const,
  displayName: 'New base',
  target: 'male' as const,
  categories: [7],
  isFullbody: true,
  bundledId: null,
  imageUrl: 'https://s3/body.png',
  previewUrl: null,
  isFree: true,
  isOwned: true,
  isRetired: false,
  price: 0,
  sortOrder: 0,
  isSelectable: true,
  ...over,
});

const lookup = (...rows: any[]) =>
  rows.reduce((acc, r) => ({ ...acc, [r.key]: r }), {});

const baseFrom = (over: any = {}) =>
  resolveBases(lookup(row(over))).find((b) => b.id === 'new_base_1')!;

describe('the bundled eye fallback', () => {
  /**
   * The regression: category was tested before target, so any male body whose
   * category was not 1 or 2 fell through to the female overlay - which is every
   * male base created since a category stopped being a number an admin types.
   */
  it('gives an unknown male category the male overlay, not the female one', () => {
    for (const category of [3, 7, 99]) {
      expect(getEyeSource('half', 'male', category)).toBe(
        getEyeSource('half', 'male', 1),
      );
      expect(getEyeSource('full', 'male', category)).toBe(
        getEyeSource('full', 'male', 1),
      );
    }
  });

  it('never hands a male body the female overlay', () => {
    for (const category of [1, 2, 3, 7, 99]) {
      expect(getEyeSource('half', 'male', category)).not.toBe(
        getEyeSource('half', 'female', 4),
      );
    }
  });

  // The five shipped bodies must look exactly as they did.
  it('keeps every bundled body on the overlay it already used', () => {
    expect(getEyeSource('half', 'male', 1)).not.toBe(getEyeSource('half', 'male', 2));
    expect(getEyeSource('full', 'male', 1)).not.toBe(getEyeSource('full', 'male', 2));

    for (const category of [4, 5, 6]) {
      expect(getEyeSource('half', 'female', category)).toBe(
        getEyeSource('half', 'female', 4),
      );
    }
  });

  it('serves a distinct frame for each phase', () => {
    expect(getEyeSource('half', 'male', 1)).not.toBe(getEyeSource('full', 'male', 1));
    expect(getEyeSource('half', 'female', 4)).not.toBe(getEyeSource('full', 'female', 4));
  });

  it('resolves for every bundled body', () => {
    for (const base of BASES) {
      expect(getEyeSource('half', base.target, base.category)).toBeDefined();
      expect(getEyeSource('full', base.target, base.category)).toBeDefined();
    }
  });
});

describe('one closed frame across both phases', () => {
  // A single opacity for both closed phases reads as an on/off flicker; the
  // half phase is what makes it a blink.
  it('draws the half phase partly, and the closed phase fully', () => {
    expect(blinkOpacity('closed')).toBe(1);
    expect(blinkOpacity('half_closed')).toBe(HALF_CLOSED_OPACITY);
    expect(blinkOpacity('half_closed')).toBeGreaterThan(0);
    expect(blinkOpacity('half_closed')).toBeLessThan(1);
  });

  it('draws nothing while the eye is open', () => {
    expect(blinkOpacity('open')).toBe(0);
  });

  it('orders the phases open < half < closed', () => {
    expect(blinkOpacity('open')).toBeLessThan(blinkOpacity('half_closed'));
    expect(blinkOpacity('half_closed')).toBeLessThan(blinkOpacity('closed'));
  });
});

describe('a catalogue base with its own closed artwork', () => {
  it('blinks with the artwork it brought', () => {
    const base = baseFrom({ blinkEyeUrl: 'https://s3/blink.png' });

    expect(blinkSourcesFor(base)?.blink).toEqual({ uri: 'https://s3/blink.png' });
  });

  // Without one it falls back to the bundled overlays, which is what every
  // migrated body does.
  it('leaves the source null so the bundled pair is used', () => {
    expect(blinkSourcesFor(baseFrom())?.blink).toBeNull();
  });

  it('does not blink at all when that is turned off', () => {
    expect(blinkSourcesFor(baseFrom({ blinkEnabled: false }))).toBeNull();
  });

  it('blinks by default, so nothing existing changes', () => {
    expect(blinkSourcesFor(baseFrom())).not.toBeNull();
  });
});

describe('open-eye artwork', () => {
  /**
   * Optional by design: it exists for a body drawn without eyes. Every bundled
   * body has them painted into its artwork, which is why there is no bundled
   * counterpart to fall back to.
   */
  it('is carried through when a body supplies it', () => {
    const base = baseFrom({ normalEyeUrl: 'https://s3/open.png' });

    expect(base.normalEyeSource).toEqual({ uri: 'https://s3/open.png' });
    expect(blinkSourcesFor(base)?.normal).toEqual({ uri: 'https://s3/open.png' });
  });

  it('is null when the body draws its own eyes', () => {
    expect(baseFrom().normalEyeSource).toBeNull();
    expect(blinkSourcesFor(baseFrom())?.normal).toBeNull();
  });

  it('is independent of the closed frame', () => {
    const base = baseFrom({ normalEyeUrl: 'https://s3/open.png' });

    expect(blinkSourcesFor(base)?.normal).not.toBeNull();
    expect(blinkSourcesFor(base)?.blink).toBeNull();
  });
});
