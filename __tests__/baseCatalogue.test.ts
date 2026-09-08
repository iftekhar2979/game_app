import {
  blinkSourcesFor,
  characterIdOf,
  describeVariant,
  resolveBaseById,
  resolveBases,
  toBase,
  tonesForBase,
  tonesOf,
} from '../src/avatar/baseCatalogue';
import { BASES } from '../src/avatar/registry';
import { toCharacter } from '../src/store/api/avatarAssetsTransforms';

/**
 * Base Avatars, as the app resolves them.
 *
 * Two paths that must not be confused, and most of this file is about keeping
 * them apart:
 *
 * - The **picker** path lists bodies to choose from, and comes from the server's
 *   character list. There is deliberately no bundled fallback: a body the server
 *   cannot describe is a body whose wardrobe cannot be scoped, and offering one
 *   would mean guessing its garments locally - the leak this replaced.
 * - The **render** path resolves a saved avatar's body by id, and *does* fall
 *   back to the bundle, ignores retirement and ignores assignment. A look saved
 *   months ago must draw the same today.
 */

const variant = (over: any = {}) => ({
  key: 'aurora_light',
  slot: 'base' as const,
  displayName: 'Aurora',
  target: 'female' as const,
  characterId: 'aurora',
  bodyColorId: 'light',
  isFullbody: true,
  bundledId: null,
  imageUrl: 'https://s3/aurora_light.png',
  previewUrl: null,
  isFree: true,
  isOwned: true,
  isRetired: false,
  price: 0,
  sortOrder: 0,
  isSelectable: true,
  ...over,
});

/** A character as the API sends it, through the real transform. */
const character = (characterId: string, variants: any[], over: any = {}) =>
  toCharacter({
    characterId,
    displayName: characterId,
    target: 'female',
    sortOrder: 0,
    variants,
    ...over,
  } as any);

const AURORA = character('aurora', [
  variant({ key: 'aurora_light', bodyColorId: 'light', sortOrder: 0 }),
  variant({ key: 'aurora_dark', bodyColorId: 'dark', sortOrder: 1 }),
]);

const NOVA = character('nova', [
  variant({ key: 'nova_light', characterId: 'nova', bodyColorId: 'light' }),
]);

describe('the picker has no bundled fallback', () => {
  /**
   * The deliberate trade. Previously the five bundled bodies were merged in, so
   * an unreachable catalogue still filled the picker - with bodies whose
   * wardrobes then had to be guessed at by category number.
   */
  it('lists nothing when the character list is unavailable', () => {
    expect(resolveBases(undefined)).toEqual([]);
    expect(resolveBases(null)).toEqual([]);
    expect(resolveBases([])).toEqual([]);
  });

  it('lists exactly the tones the server described', () => {
    expect(resolveBases([AURORA, NOVA]).map((b) => b.id)).toEqual([
      'aurora_light',
      'aurora_dark',
      'nova_light',
    ]);
  });
});

describe('a body created in the dashboard', () => {
  it('resolves with no app release', () => {
    const base = toBase(
      variant({ key: 'brand_new_body', imageUrl: 'https://s3/brand_new_body.png' }),
    )!;

    expect(base.id).toBe('brand_new_body');
    expect(base.source).toEqual({ uri: 'https://s3/brand_new_body.png' });
  });

  it('carries its metadata across', () => {
    const base = toBase(variant({ isFullbody: false, bodyColorId: 'dark' }))!;

    expect(base.target).toBe('female');
    expect(base.characterId).toBe('aurora');
    expect(base.bodyColorId).toBe('dark');
    expect(base.isFullbody).toBe(false);
  });

  it('is skipped when nothing could draw it', () => {
    // An invisible body in the picker reads as a broken app rather than as a
    // missing upload.
    expect(toBase(variant({ key: 'no_art', imageUrl: null }))).toBeNull();
  });

  it('is skipped when it belongs to no character', () => {
    // A body with no character is one no scoped listing can return, and
    // therefore one whose wardrobe cannot be resolved at all.
    expect(toBase(variant({ characterId: null }))).toBeNull();
  });

  it('draws from the bundle when the row carries no upload', () => {
    const base = toBase(
      variant({ key: 'base_avatar_3', imageUrl: null, characterId: 'base_avatar_3' }),
    )!;

    expect(base.source).toBe(BASES.find((b) => b.id === 'base_avatar_3')!.source);
  });

  it('prefers uploaded artwork over the bundled file of the same id', () => {
    const base = toBase(
      variant({ key: 'base_avatar_3', imageUrl: 'https://s3/reskin.png' }),
    )!;

    expect(base.source).toEqual({ uri: 'https://s3/reskin.png' });
  });
});

describe('retirement', () => {
  it('keeps a retired tone out of the picker', () => {
    const partly = character('aurora', [
      variant({ key: 'aurora_light', sortOrder: 0 }),
      variant({ key: 'aurora_dark', sortOrder: 1, lifecycle: 'retired' }),
    ]);

    expect(tonesOf(partly).map((b) => b.id)).toEqual(['aurora_light']);
  });

  it('still resolves a retired body by id, so saved avatars keep rendering', () => {
    // The render path deliberately ignores retirement: withdrawing a body stops
    // it being chosen, it does not un-draw the avatars already built on it.
    const base = resolveBaseById('aurora_dark', {
      aurora_dark: variant({ key: 'aurora_dark', isRetired: true }) as any,
    });

    expect(base?.id).toBe('aurora_dark');
  });
});

describe('resolving one body by id, for rendering', () => {
  it('finds a catalogue-only body', () => {
    expect(
      resolveBaseById('aurora_light', { aurora_light: variant() as any })?.id,
    ).toBe('aurora_light');
  });

  it('finds a bundled body with no catalogue at all', () => {
    // The offline render path: the feed and the wardrobe never load a character
    // list, and every avatar built on a shipped body must still draw.
    const base = resolveBaseById('base_avatar_3');

    expect(base?.id).toBe('base_avatar_3');
    expect(base?.characterId).toBe('base_avatar_3');
  });

  it('returns undefined for an id nothing describes', () => {
    expect(resolveBaseById('never_existed', {})).toBeUndefined();
    expect(resolveBaseById(null)).toBeUndefined();
  });

  it('ignores a row that is not a base', () => {
    expect(
      resolveBaseById('hair6', { hair6: { ...variant({ key: 'hair6' }), slot: 'hair' } as any }),
    ).toBeUndefined();
  });
});

/**
 * The thing that makes a wardrobe survive a skin-tone switch.
 *
 * Every tone of one character resolves the same `characterId`, so the editor
 * fetches the same wardrobe whichever tone is worn - and switching tone keeps
 * the outfit rather than emptying it.
 */
describe('tones share a character', () => {
  it('gives every tone of one character the same characterId', () => {
    expect(characterIdOf('aurora_light', [AURORA, NOVA])).toBe('aurora');
    expect(characterIdOf('aurora_dark', [AURORA, NOVA])).toBe('aurora');
  });

  it('gives a different character a different one', () => {
    expect(characterIdOf('nova_light', [AURORA, NOVA])).toBe('nova');
  });

  it('resolves the same tone list from either tone', () => {
    const fromLight = tonesForBase('aurora_light', [AURORA, NOVA]).map((b) => b.id);
    const fromDark = tonesForBase('aurora_dark', [AURORA, NOVA]).map((b) => b.id);

    expect(fromLight).toEqual(fromDark);
    expect(fromLight).toEqual(['aurora_light', 'aurora_dark']);
  });

  it('never mixes another character’s tones in', () => {
    expect(tonesForBase('aurora_light', [AURORA, NOVA]).map((b) => b.id)).not.toContain(
      'nova_light',
    );
  });

  it('falls back to the bundle’s own grouping for an unknown body', () => {
    expect(characterIdOf('base_avatar_3', [AURORA])).toBe('base_avatar_3');
    expect(characterIdOf('never_existed', [AURORA])).toBeNull();
  });
});

describe('one entry per character', () => {
  it('collapses the tones of one character into a single entry', () => {
    expect(AURORA.variants.map((v) => v.key)).toEqual(['aurora_light', 'aurora_dark']);
    expect(AURORA.primary.key).toBe('aurora_light');
  });

  it('labels each tone readably', () => {
    const [light, dark] = tonesOf(AURORA);

    expect(describeVariant(light, 0)).toBe('Light');
    expect(describeVariant(dark, 1)).toBe('Dark');
  });

  it('falls back to a positional label for a tone with no id', () => {
    const base = toBase(variant({ bodyColorId: null }))!;

    expect(describeVariant(base, 2)).toBe('Tone 3');
  });
});

describe('blink configuration', () => {
  it('uses the uploaded closed-eye artwork', () => {
    const base = toBase(
      variant({ blinkEyeUrl: 'https://s3/closed.png', normalEyeUrl: 'https://s3/open.png' }),
    )!;

    expect(blinkSourcesFor(base)).toEqual({
      normal: { uri: 'https://s3/open.png' },
      blink: { uri: 'https://s3/closed.png' },
    });
  });

  it('leaves the source null so the renderer can fall back to the bundled pair', () => {
    const base = toBase(variant())!;

    expect(blinkSourcesFor(base)).toEqual({ normal: null, blink: null });
  });

  it('reports no blinking at all when it is turned off', () => {
    const base = toBase(variant({ blinkEnabled: false }))!;

    expect(blinkSourcesFor(base)).toBeNull();
  });

  it('blinks by default, so migrated bodies are unaffected', () => {
    const base = toBase(variant())!;

    expect(base.blinkEnabled).toBe(true);
  });
});
