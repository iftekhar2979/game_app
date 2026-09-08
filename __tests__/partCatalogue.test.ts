import { isKnownPart, resolveParts } from '../src/avatar/partCatalogue';
import { getAssetById } from '../src/avatar/registry';

/**
 * What one Base Avatar may wear.
 *
 * This file used to assert the opposite contract: that `resolveParts` returned
 * the bundled list first, at stable indices, with catalogue rows appended. That
 * was the leak written down as a test - the bundled prefix was selected by
 * category number and never looked at the body being dressed, so every
 * character carrying that number was offered the same garments.
 *
 * The contract now is that the response *is* the list. The rows handed in are
 * one character's scoped wardrobe, fetched per character, so there is nothing
 * left to filter and nothing that can widen it.
 */

const TARGET = 'female' as const;

const row = (over: any = {}) => ({
  key: 'aurora_shirt_1',
  slot: 'outfit',
  displayName: 'Aurora shirt',
  target: TARGET,
  characterId: 'aurora',
  isFullbody: true,
  bundledId: null,
  imageUrl: 'https://s3/aurora_shirt_1.png',
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

describe('the bundle is not a list', () => {
  /**
   * The single most important assertion in this file.
   *
   * `suit1`, `hair6` and the rest are compiled into the app and were previously
   * returned for any female body of category 4-6. They must now appear only
   * because a character was assigned them.
   */
  it('returns nothing for a character with an empty wardrobe', () => {
    expect(resolveParts('outfit', TARGET, {})).toEqual([]);
    expect(resolveParts('hair', TARGET, {})).toEqual([]);
    expect(resolveParts('shoes', TARGET, {})).toEqual([]);
  });

  it('returns nothing when the wardrobe could not be fetched', () => {
    // Deliberately not a fallback to the bundle. Falling back would mean
    // falling back to category matching, and doing so precisely when the
    // server is unreachable and nobody can see that it happened.
    expect(resolveParts('outfit', TARGET, undefined)).toEqual([]);
    expect(resolveParts('outfit', TARGET, null)).toEqual([]);
  });

  it('offers a bundled asset only when the character was assigned it', () => {
    const assigned = resolveParts(
      'outfit',
      TARGET,
      lookup(row({ key: 'suit1', imageUrl: null, bundledId: 'suit1' })),
    );

    expect(assigned.map((asset) => asset.id)).toEqual(['suit1']);
    // And it still draws from the bundle, which is the half that is kept.
    expect(assigned[0].source).toBe(getAssetById('outfit', 'suit1')!.source);
  });
});

describe('isolation', () => {
  /**
   * Two characters whose wardrobes were indistinguishable under the old rules:
   * same gender, same slot, artwork that used to carry the same category.
   */
  const auroraWardrobe = lookup(
    row({ key: 'aurora_shirt_1', characterId: 'aurora' }),
    row({ key: 'aurora_hair_1', slot: 'hair', characterId: 'aurora' }),
  );

  const novaWardrobe = lookup(
    row({ key: 'nova_shirt_1', characterId: 'nova' }),
    row({ key: 'festival_hat', slot: 'hair', characterId: 'nova' }),
  );

  it('offers each character only what its own response contained', () => {
    expect(resolveParts('outfit', TARGET, auroraWardrobe).map((a) => a.id)).toEqual([
      'aurora_shirt_1',
    ]);
    expect(resolveParts('outfit', TARGET, novaWardrobe).map((a) => a.id)).toEqual([
      'nova_shirt_1',
    ]);
  });

  it('has no way to reach the other character’s asset', () => {
    const aurora = resolveParts('hair', TARGET, auroraWardrobe).map((a) => a.id);

    expect(aurora).toEqual(['aurora_hair_1']);
    expect(aurora).not.toContain('festival_hat');
  });

  it('offers a shared asset to whichever wardrobe contains it', () => {
    // Sharing is two assignment rows on the server, so it arrives as a row in
    // both responses. There is no client-side notion of "shared" to get wrong.
    const shared = row({ key: 'festival_hat', slot: 'hair', isShared: true });

    expect(
      resolveParts('hair', TARGET, lookup(shared)).map((a) => a.id),
    ).toEqual(['festival_hat']);
    expect(
      resolveParts('hair', TARGET, lookup(row({ key: 'other_hair', slot: 'hair' }))).map(
        (a) => a.id,
      ),
    ).toEqual(['other_hair']);
  });

  it('ignores gender entirely', () => {
    // A male-tagged garment in a female character's wardrobe is offered: the
    // response decided, and gender is display metadata. The inverse of the old
    // rule, deliberately.
    const wardrobe = lookup(row({ key: 'unisex_shirt', target: 'male' }));

    expect(resolveParts('outfit', TARGET, wardrobe).map((a) => a.id)).toEqual([
      'unisex_shirt',
    ]);
  });
});

describe('ordering', () => {
  it('follows this character’s arrangement, not the asset’s own', () => {
    // The point of a per-assignment order: a shared garment can sit first for
    // one character and last for another, which one field on the asset cannot
    // express.
    const wardrobe = lookup(
      row({ key: 'a_shirt', sortOrder: 0, assignmentSortOrder: 2 }),
      row({ key: 'b_shirt', sortOrder: 1, assignmentSortOrder: 0 }),
      row({ key: 'c_shirt', sortOrder: 2, assignmentSortOrder: 1 }),
    );

    expect(resolveParts('outfit', TARGET, wardrobe).map((a) => a.id)).toEqual([
      'b_shirt',
      'c_shirt',
      'a_shirt',
    ]);
  });

  it('falls back to the asset’s own order when there is no assignment order', () => {
    const wardrobe = lookup(
      row({ key: 'z_shirt', sortOrder: 0 }),
      row({ key: 'a_shirt', sortOrder: 1 }),
    );

    expect(resolveParts('outfit', TARGET, wardrobe).map((a) => a.id)).toEqual([
      'z_shirt',
      'a_shirt',
    ]);
  });
});

describe('what is drawable', () => {
  it('drops a row with no artwork anywhere, rather than showing a hole', () => {
    const wardrobe = lookup(
      row({ key: 'ghost_shirt', imageUrl: null, bundledId: null }),
    );

    expect(resolveParts('outfit', TARGET, wardrobe)).toEqual([]);
  });

  it('drops a retired row, which cannot be chosen for a new look', () => {
    const wardrobe = lookup(row({ isRetired: true }));

    expect(resolveParts('outfit', TARGET, wardrobe)).toEqual([]);
  });

  it('ignores a row sitting in a different slot', () => {
    const wardrobe = lookup(row({ slot: 'hair' }));

    expect(resolveParts('outfit', TARGET, wardrobe)).toEqual([]);
  });

  it('prefers uploaded artwork over the bundled copy of the same id', () => {
    const wardrobe = lookup(
      row({ key: 'suit1', imageUrl: 'https://s3/suit1.png' }),
    );

    expect(resolveParts('outfit', TARGET, wardrobe)[0].source).toEqual({
      uri: 'https://s3/suit1.png',
    });
  });
});

/**
 * Rendering a saved look, as opposed to choosing a new one.
 *
 * `isKnownPart` asks whether something can be *drawn*, never whether it may be
 * *picked*. A saved avatar only needs the first, which is what lets a look keep
 * rendering after the part it wears has been retired or unassigned.
 */
describe('isKnownPart', () => {
  it('knows every bundled part, with no catalogue at all', () => {
    expect(isKnownPart('outfit', 'suit1')).toBe(true);
    expect(isKnownPart('hair', 'hair6')).toBe(true);
  });

  it('knows an uploaded part from the catalogue', () => {
    expect(isKnownPart('outfit', 'aurora_shirt_1', lookup(row()))).toBe(true);
  });

  it('still knows a retired part, so a saved avatar keeps rendering it', () => {
    // The asymmetry with `resolveParts` above is the whole point: retired is
    // unpickable, not undrawable.
    expect(isKnownPart('outfit', 'aurora_shirt_1', lookup(row({ isRetired: true })))).toBe(
      true,
    );
    expect(isKnownPart('outfit', 'suit1', {})).toBe(true);
  });

  it('does not know a part that never existed', () => {
    expect(isKnownPart('outfit', 'never_shipped', {})).toBe(false);
    expect(isKnownPart('outfit', null)).toBe(false);
  });
});
