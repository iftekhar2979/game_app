import {
  blinkOpacity,
  blinkSourcesFor,
  HALF_CLOSED_OPACITY,
  toBase,
} from '../src/avatar/baseCatalogue';
import { BASES, getEyeSource } from '../src/avatar/registry';

const row = (over: any = {}) => ({
  key: 'new_base_1',
  slot: 'base' as const,
  displayName: 'New base',
  target: 'male' as const,
  characterId: 'new_character',
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

/** One catalogue row, resolved to the renderable body it describes. */
const baseFrom = (over: any = {}) => toBase(row(over))!;

describe('the bundled eye fallback', () => {
  /**
   * The regression this replaced: a category was tested before the target, so
   * any male body whose number was not 1 or 2 fell through to the female
   * overlay. Keyed by base id there is no number to fall through, and an
   * unrecognised male body gets the male overlay by construction.
   */
  it('gives an unrecognised male body the male overlay, not the female one', () => {
    for (const baseId of ['new_male_body', 'male_avatar_9', null]) {
      expect(getEyeSource('half', 'male', baseId)).toBe(
        getEyeSource('half', 'male', 'male_avatar_1'),
      );
      expect(getEyeSource('full', 'male', baseId)).toBe(
        getEyeSource('full', 'male', 'male_avatar_1'),
      );
    }
  });

  it('never hands a male body the female overlay', () => {
    for (const baseId of ['male_avatar_1', 'male_avatar_2', 'new_male_body']) {
      expect(getEyeSource('half', 'male', baseId)).not.toBe(
        getEyeSource('half', 'female', 'base_avatar_3'),
      );
    }
  });

  // The five shipped bodies must look exactly as they did.
  it('keeps every bundled body on the overlay it already used', () => {
    // The two shipped male bodies have separate eye artwork, and are now told
    // apart by their own ids rather than by a category number.
    expect(getEyeSource('half', 'male', 'male_avatar_1')).not.toBe(
      getEyeSource('half', 'male', 'male_avatar_2'),
    );
    expect(getEyeSource('full', 'male', 'male_avatar_1')).not.toBe(
      getEyeSource('full', 'male', 'male_avatar_2'),
    );

    for (const baseId of ['base_avatar_3', 'base_avatar_4', 'new_female_body']) {
      expect(getEyeSource('half', 'female', baseId)).toBe(
        getEyeSource('half', 'female', 'base_avatar_3'),
      );
    }
  });

  it('serves a distinct frame for each phase', () => {
    expect(getEyeSource('half', 'male', 'male_avatar_1')).not.toBe(getEyeSource('full', 'male', 'male_avatar_1'));
    expect(getEyeSource('half', 'female', 'base_avatar_3')).not.toBe(getEyeSource('full', 'female', 'base_avatar_3'));
  });

  it('resolves for every bundled body', () => {
    for (const base of BASES) {
      expect(getEyeSource('half', base.target, base.id)).toBeDefined();
      expect(getEyeSource('full', base.target, base.id)).toBeDefined();
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
