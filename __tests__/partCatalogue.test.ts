import { isKnownPart, resolveParts } from '../src/avatar/partCatalogue';
import { listFor } from '../src/avatar/registry';

/** A female body 4, which the bundle has garments for in every slot. */
const TARGET = 'female' as const;
const CATEGORY = 4;

const row = (over: any = {}) => ({
  key: 'new_shirt_1',
  slot: 'outfit',
  displayName: 'New Shirt',
  target: TARGET,
  categories: [CATEGORY],
  isFullbody: true,
  bundledId: null,
  imageUrl: 'https://s3/new_shirt_1.png',
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
  it('falls back to the bundled list, unchanged', () => {
    const bundled = listFor('outfit', TARGET, CATEGORY);
    expect(resolveParts('outfit', TARGET, CATEGORY, undefined)).toEqual(bundled);
    expect(resolveParts('outfit', TARGET, CATEGORY, null)).toEqual(bundled);
  });

  it('is unchanged by a catalogue that adds nothing', () => {
    const bundled = listFor('outfit', TARGET, CATEGORY);
    expect(resolveParts('outfit', TARGET, CATEGORY, {})).toEqual(bundled);
  });
});

/**
 * The pickers hold an index into this list and convert it back to an id with
 * the same list. If the order shifted when the catalogue arrived, a selection
 * made a moment earlier would come to mean a different garment.
 */
describe('index stability', () => {
  it.each(['outfit', 'skirt', 'shoes', 'hair'] as const)(
    'keeps every bundled %s at its original index',
    (slot) => {
      const bundled = listFor(slot, TARGET, CATEGORY);
      const merged = resolveParts(slot, TARGET, CATEGORY, lookup(row({ slot })));

      bundled.forEach((asset, index) => {
        expect(merged[index].id).toBe(asset.id);
      });
    },
  );

  it('appends catalogue-only assets after the bundled ones', () => {
    const bundled = listFor('outfit', TARGET, CATEGORY);
    const merged = resolveParts('outfit', TARGET, CATEGORY, lookup(row()));

    expect(merged).toHaveLength(bundled.length + 1);
    expect(merged[merged.length - 1].id).toBe('new_shirt_1');
  });

  it('orders appended assets by sortOrder', () => {
    const merged = resolveParts(
      'outfit',
      TARGET,
      CATEGORY,
      lookup(
        row({ key: 'second', sortOrder: 2 }),
        row({ key: 'first', sortOrder: 1 }),
      ),
    );
    const ids = merged.map((a) => a.id);
    expect(ids.indexOf('first')).toBeLessThan(ids.indexOf('second'));
  });
});

describe('a garment created in the dashboard', () => {
  it.each(['outfit', 'skirt', 'shoes', 'hair', 'bodyColor'] as const)(
    'appears in the %s picker',
    (slot) => {
      const merged = resolveParts(slot, TARGET, CATEGORY, lookup(row({ slot })));
      expect(merged.map((a) => a.id)).toContain('new_shirt_1');
    },
  );

  it('draws from its uploaded artwork', () => {
    const merged = resolveParts('outfit', TARGET, CATEGORY, lookup(row()));
    const added = merged.find((a) => a.id === 'new_shirt_1');
    expect(added?.source).toEqual({ uri: 'https://s3/new_shirt_1.png' });
  });
});

describe('compatibility is respected', () => {
  it('excludes another slot', () => {
    const merged = resolveParts('outfit', TARGET, CATEGORY, lookup(row({ slot: 'hair' })));
    expect(merged.map((a) => a.id)).not.toContain('new_shirt_1');
  });

  it('excludes the other gender', () => {
    const merged = resolveParts('outfit', TARGET, CATEGORY, lookup(row({ target: 'male' })));
    expect(merged.map((a) => a.id)).not.toContain('new_shirt_1');
  });

  it('excludes a garment drawn for another category', () => {
    const merged = resolveParts('outfit', TARGET, CATEGORY, lookup(row({ categories: [9] })));
    expect(merged.map((a) => a.id)).not.toContain('new_shirt_1');
  });

  it('includes a garment listing several categories, one of which fits', () => {
    const merged = resolveParts(
      'outfit',
      TARGET,
      CATEGORY,
      lookup(row({ categories: [CATEGORY, 5, 6] })),
    );
    expect(merged.map((a) => a.id)).toContain('new_shirt_1');
  });

  it('excludes a row with no artwork anywhere', () => {
    const merged = resolveParts('outfit', TARGET, CATEGORY, lookup(row({ imageUrl: null })));
    expect(merged.map((a) => a.id)).not.toContain('new_shirt_1');
  });
});

describe('retirement', () => {
  it('hides a retired catalogue-only garment', () => {
    const merged = resolveParts('outfit', TARGET, CATEGORY, lookup(row({ isRetired: true })));
    expect(merged.map((a) => a.id)).not.toContain('new_shirt_1');
  });

  /**
   * A retired *bundled* asset stays listed. That is what the app already did -
   * the tile is dimmed by resolveAssetState rather than removed - and removing
   * it would shift every index after it.
   */
  it('keeps a retired bundled garment in place', () => {
    const bundled = listFor('outfit', TARGET, CATEGORY);
    const first = bundled[0];
    const merged = resolveParts(
      'outfit',
      TARGET,
      CATEGORY,
      lookup(row({ key: first.id, isRetired: true })),
    );

    expect(merged[0].id).toBe(first.id);
    expect(merged).toHaveLength(bundled.length);
  });
});

describe('recognising a saved part', () => {
  const bundled = listFor('outfit', TARGET, CATEGORY)[0];

  it('recognises a bundled id with no catalogue at all', () => {
    expect(isKnownPart('outfit', bundled.id, undefined)).toBe(true);
  });

  // Without this a look wearing a dashboard shirt came back with that slot
  // emptied, because normaliseConfig only knew the bundle.
  it('recognises a catalogue-only id', () => {
    expect(isKnownPart('outfit', 'new_shirt_1', lookup(row()))).toBe(true);
  });

  it('rejects an id nothing describes', () => {
    expect(isKnownPart('outfit', 'nope', lookup(row()))).toBe(false);
    expect(isKnownPart('outfit', null, lookup(row()))).toBe(false);
    expect(isKnownPart('outfit', undefined, undefined)).toBe(false);
  });

  it('rejects a catalogue id filed under a different slot', () => {
    expect(isKnownPart('hair', 'new_shirt_1', lookup(row()))).toBe(false);
  });

  it('rejects a catalogue id with no artwork', () => {
    expect(isKnownPart('outfit', 'new_shirt_1', lookup(row({ imageUrl: null })))).toBe(false);
  });
});
