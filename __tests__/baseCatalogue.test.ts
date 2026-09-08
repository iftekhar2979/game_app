import {
  blinkSourcesFor,
  categoryOf,
  hasCompatibleGarments,
  resolveBaseById,
  resolveBases,
  variantsOf,
} from '../src/avatar/baseCatalogue';
import { BASES } from '../src/avatar/registry';

const row = (over: any = {}) => ({
  key: 'new_base_1',
  slot: 'base' as const,
  displayName: 'New base',
  target: 'female' as const,
  categories: [7],
  isFullbody: true,
  bundledId: null,
  imageUrl: 'https://s3/new_base_1.png',
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

describe('no catalogue', () => {
  // An unreachable or unseeded catalogue must leave the editor as it was.
  it('falls back to the bundled bases', () => {
    expect(resolveBases(undefined).map((b) => b.id)).toEqual(BASES.map((b) => b.id));
    expect(resolveBases(null)).toHaveLength(BASES.length);
    expect(resolveBases({})).toHaveLength(BASES.length);
  });
});

describe('a base created in the dashboard', () => {
  // The whole point: it appears with no app release.
  it('appears in the list', () => {
    const bases = resolveBases(lookup(row()));
    expect(bases.map((b) => b.id)).toContain('new_base_1');
  });

  it('carries its metadata across', () => {
    const base = resolveBases(lookup(row({ categories: [7], isFullbody: false })))
      .find((b) => b.id === 'new_base_1');

    expect(base).toMatchObject({
      target: 'female',
      category: 7,
      isFullbody: false,
      source: { uri: 'https://s3/new_base_1.png' },
    });
  });

  // Listing a base nothing can draw puts an invisible body in the picker.
  it('is skipped when it has no artwork and no bundled fallback', () => {
    const bases = resolveBases(lookup(row({ imageUrl: null })));
    expect(bases.map((b) => b.id)).not.toContain('new_base_1');
  });

  it('is skipped when it has no usable category', () => {
    expect(
      resolveBases(lookup(row({ categories: [] }))).map((b) => b.id),
    ).not.toContain('new_base_1');
  });
});

describe('bundled bases', () => {
  const bundled = BASES[0];

  it('are kept when the catalogue does not mention them', () => {
    const bases = resolveBases(lookup(row()));
    expect(bases.map((b) => b.id)).toContain(bundled.id);
  });

  it('draw from the bundle when the catalogue lists them with no upload', () => {
    const bases = resolveBases(
      lookup(row({ key: bundled.id, imageUrl: null, categories: [bundled.category] })),
    );
    const resolved = bases.find((b) => b.id === bundled.id);
    expect(resolved?.source).toBe(bundled.source);
  });

  // An admin re-skinning an existing base must take effect immediately.
  it('prefer uploaded artwork over the bundled file', () => {
    const bases = resolveBases(
      lookup(row({ key: bundled.id, imageUrl: 'https://s3/reskin.png', categories: [bundled.category] })),
    );
    expect(bases.find((b) => b.id === bundled.id)?.source).toEqual({
      uri: 'https://s3/reskin.png',
    });
  });

  it('are re-categorised when the catalogue says so', () => {
    const bases = resolveBases(lookup(row({ key: bundled.id, categories: [9] })));
    expect(bases.find((b) => b.id === bundled.id)?.category).toBe(9);
  });
});

describe('retirement', () => {
  it('hides a retired base from the picker', () => {
    const bases = resolveBases(lookup(row({ isRetired: true })));
    expect(bases.map((b) => b.id)).not.toContain('new_base_1');
  });

  it('hides a retired bundled base too', () => {
    const bundled = BASES[0];
    const bases = resolveBases(
      lookup(row({ key: bundled.id, isRetired: true, categories: [bundled.category] })),
    );
    expect(bases.map((b) => b.id)).not.toContain(bundled.id);
  });

  // Withdrawing a base stops it being chosen; it does not un-draw the avatars
  // already built on it.
  it('still resolves a retired base by id, so saved avatars keep rendering', () => {
    const assets = lookup(row({ isRetired: true }));
    expect(resolveBaseById('new_base_1', assets)?.id).toBe('new_base_1');
  });
});

describe('resolving one base by id', () => {
  it('finds a catalogue-only base', () => {
    expect(resolveBaseById('new_base_1', lookup(row()))?.category).toBe(7);
  });

  it('finds a bundled base with no catalogue at all', () => {
    expect(resolveBaseById(BASES[0].id, undefined)?.id).toBe(BASES[0].id);
  });

  it('returns undefined for an id nothing describes', () => {
    expect(resolveBaseById('nope', lookup(row()))).toBeUndefined();
    expect(resolveBaseById(null, lookup(row()))).toBeUndefined();
    expect(resolveBaseById(undefined, undefined)).toBeUndefined();
  });

  it('ignores a row that is not a base', () => {
    const assets = lookup(row({ key: 'hair2', slot: 'hair' }));
    expect(resolveBaseById('hair2', assets)).toBeUndefined();
  });
});

describe('ordering', () => {
  it('follows the catalogue sort order', () => {
    const bases = resolveBases(
      lookup(
        row({ key: 'b_second', sortOrder: 2 }),
        row({ key: 'a_first', sortOrder: 1 }),
      ),
    );
    const ids = bases.map((b) => b.id);
    expect(ids.indexOf('a_first')).toBeLessThan(ids.indexOf('b_second'));
  });
});

describe('garment compatibility', () => {
  const garment = (over: any = {}) =>
    row({ key: 'shirt_x', slot: 'outfit', categories: [7], ...over });

  it('reads a base category from its one-element array', () => {
    expect(categoryOf(row({ categories: [7] }) as any)).toBe(7);
    expect(categoryOf(row({ categories: [] }) as any)).toBeNull();
  });

  it('sees a garment drawn for the same category and target', () => {
    expect(
      hasCompatibleGarments({ target: 'female', category: 7 }, lookup(garment())),
    ).toBe(true);
  });

  // A new category is exactly the case an admin needs warning about: the base
  // is undressable until artwork is drawn for it.
  it('reports none for a category no garment lists', () => {
    expect(
      hasCompatibleGarments({ target: 'female', category: 99 }, lookup(garment())),
    ).toBe(false);
  });

  it('does not count the other gender, a retired garment, or another base', () => {
    expect(
      hasCompatibleGarments({ target: 'male', category: 7 }, lookup(garment())),
    ).toBe(false);
    expect(
      hasCompatibleGarments(
        { target: 'female', category: 7 },
        lookup(garment({ isRetired: true })),
      ),
    ).toBe(false);
    expect(
      hasCompatibleGarments({ target: 'female', category: 7 }, lookup(row())),
    ).toBe(false);
  });
});

describe('colour variants of one character', () => {
  const light = row({ key: 'male_1_light', characterId: 'male_avatar_1', bodyColorId: 'light' });
  const dark = row({ key: 'male_1_dark', characterId: 'male_avatar_1', bodyColorId: 'dark' });
  const other = row({ key: 'female_2', characterId: 'female_avatar_2' });

  it('groups every tone of the same character', () => {
    const bases = resolveBases(lookup(light, dark, other));
    const resolved = bases.find((b) => b.id === 'male_1_light')!;

    expect(variantsOf(resolved, bases).map((b) => b.id).sort()).toEqual([
      'male_1_dark',
      'male_1_light',
    ]);
  });

  it('carries the variant identity through', () => {
    const resolved = resolveBases(lookup(light)).find((b) => b.id === 'male_1_light');

    expect(resolved).toMatchObject({
      characterId: 'male_avatar_1',
      bodyColorId: 'light',
    });
  });

  // A base with no characterId stands alone; grouping it with everything else
  // that also has none would merge unrelated bodies.
  it('treats a base with no character as its own only variant', () => {
    const bases = resolveBases(lookup(row({ key: 'alone_1' }), row({ key: 'alone_2' })));
    const resolved = bases.find((b) => b.id === 'alone_1')!;

    expect(variantsOf(resolved, bases).map((b) => b.id)).toEqual(['alone_1']);
  });
});

describe('blink configuration', () => {
  it('uses the uploaded closed-eye artwork', () => {
    const resolved = resolveBases(
      lookup(row({ blinkEyeUrl: 'https://s3/blink.png' })),
    ).find((b) => b.id === 'new_base_1')!;

    expect(blinkSourcesFor(resolved)?.blink).toEqual({ uri: 'https://s3/blink.png' });
  });

  // The bundled overlays are drawn for the five shipped silhouettes, so a body
  // without its own falls back to them rather than to nothing.
  it('leaves the source null so the renderer can fall back', () => {
    const resolved = resolveBases(lookup(row())).find((b) => b.id === 'new_base_1')!;

    expect(blinkSourcesFor(resolved)).toEqual({ normal: null, blink: null });
  });

  it('reports no blinking at all when it is turned off', () => {
    const resolved = resolveBases(lookup(row({ blinkEnabled: false }))).find(
      (b) => b.id === 'new_base_1',
    )!;

    expect(blinkSourcesFor(resolved)).toBeNull();
  });

  it('blinks by default, so migrated bodies are unaffected', () => {
    const resolved = resolveBases(lookup(row())).find((b) => b.id === 'new_base_1')!;

    expect(resolved.blinkEnabled).toBe(true);
    expect(blinkSourcesFor(resolved)).not.toBeNull();
  });
});
