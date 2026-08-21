import { ASSETS, BASES, getAssetById } from '../src/avatar/registry';
import {
  describeUsedAssets,
  defaultConfig,
  humaniseAssetId,
  normaliseConfig,
} from '../src/avatar/resolveConfig';
import { AvatarConfig } from '../src/avatar/types';

/**
 * The "used assets" breakdown on My Avatars.
 *
 * It has to describe exactly the parts one saved look references — not the
 * catalogue, not picker state — and it has to keep doing so as the catalogue
 * grows, gets reordered, or retires artwork.
 */

const femaleBase = BASES.find((b) => b.id === 'base_avatar_3')!;
const maleBase = BASES.find((b) => b.id === 'male_avatar_1')!;

const savedLook: AvatarConfig = {
  version: 1,
  base: 'base_avatar_3',
  parts: {
    bodyColor: null,
    skirt: 'short_pant_2',
    shoes: 'shoe_1',
    outfit: 'necksleb_1',
    hair: 'hair6',
  },
  hairColor: '#A33327',
};

const row = (items: ReturnType<typeof describeUsedAssets>, slot: string) =>
  items.find((i) => i.slot === slot)!;

describe('describeUsedAssets', () => {
  it('lists exactly the assets this config references, and no others', () => {
    const items = describeUsedAssets(savedLook);

    expect(row(items, 'base').assetId).toBe('base_avatar_3');
    expect(row(items, 'hair').assetId).toBe('hair6');
    expect(row(items, 'outfit').assetId).toBe('necksleb_1');
    expect(row(items, 'skirt').assetId).toBe('short_pant_2');
    expect(row(items, 'shoes').assetId).toBe('shoe_1');

    // Nothing from the wider catalogue leaks in.
    const referenced = items.filter((i) => i.status === 'ok' && i.slot !== 'hairColor');
    expect(referenced).toHaveLength(5);
  });

  it('carries real artwork for every resolved row', () => {
    for (const item of describeUsedAssets(savedLook)) {
      if (item.status === 'ok' && item.slot !== 'hairColor') {
        expect(item.source).toBeTruthy();
      }
    }
  });

  it('reports the hair tint on its own row', () => {
    expect(row(describeUsedAssets(savedLook), 'hairColor').color).toBe('#A33327');
  });

  it('treats "no tint" as a choice rather than a gap', () => {
    const items = describeUsedAssets({ ...savedLook, hairColor: null });

    expect(row(items, 'hairColor').status).toBe('none');
    expect(row(items, 'hairColor').color).toBeNull();
  });

  it('marks a deliberately empty slot as none, with no artwork', () => {
    const items = describeUsedAssets({
      ...savedLook,
      parts: { ...savedLook.parts, shoes: null },
    });

    expect(row(items, 'shoes').status).toBe('none');
    expect(row(items, 'shoes').assetId).toBeNull();
    expect(row(items, 'shoes').source).toBeNull();
  });

  it('flags a retired part instead of silently showing different art', () => {
    const items = describeUsedAssets({
      ...savedLook,
      parts: { ...savedLook.parts, outfit: 'outfit_that_was_pulled' },
    });
    const outfit = row(items, 'outfit');

    expect(outfit.status).toBe('retired');
    // The stored id survives so the UI can be honest about what is missing...
    expect(outfit.assetId).toBe('outfit_that_was_pulled');
    // ...and no substitute artwork is offered.
    expect(outfit.source).toBeNull();
    // The rest of the look is unaffected.
    expect(row(items, 'hair').status).toBe('ok');
  });

  it('returns nothing when the base itself cannot be resolved', () => {
    expect(describeUsedAssets({ ...savedLook, base: 'gone' })).toEqual([]);
    expect(describeUsedAssets(null)).toEqual([]);
    expect(describeUsedAssets(undefined)).toEqual([]);
  });

  it('describes a different avatar differently', () => {
    const male = defaultConfig(maleBase);

    const a = describeUsedAssets(savedLook);
    const b = describeUsedAssets(male);

    expect(row(a, 'base').assetId).not.toBe(row(b, 'base').assetId);
    expect(row(a, 'hair').assetId).not.toBe(row(b, 'hair').assetId);
  });

  it('includes the skin overlay on a base that uses one', () => {
    const male: AvatarConfig = {
      version: 1,
      base: 'male_avatar_1',
      parts: { bodyColor: 'brown_yellow', skirt: null, shoes: null, outfit: null, hair: null },
      hairColor: null,
    };

    expect(row(describeUsedAssets(male), 'bodyColor').status).toBe('ok');
    expect(row(describeUsedAssets(male), 'bodyColor').assetId).toBe('brown_yellow');
  });
});

describe('stability against catalogue changes', () => {
  it('describes the same assets after new art is appended', () => {
    const before = describeUsedAssets(savedLook).map((i) => [i.slot, i.assetId]);

    const added = { ...getAssetById('hair', 'hair6')!, id: 'hair_brand_new' };
    ASSETS.hair.push(added);
    try {
      expect(describeUsedAssets(savedLook).map((i) => [i.slot, i.assetId])).toEqual(before);
    } finally {
      ASSETS.hair.pop();
    }
  });

  it('describes the same assets after the catalogue is reordered', () => {
    const before = describeUsedAssets(savedLook).map((i) => [i.slot, i.assetId, i.source]);

    ASSETS.hair.reverse();
    ASSETS.outfit.reverse();
    try {
      expect(describeUsedAssets(savedLook).map((i) => [i.slot, i.assetId, i.source])).toEqual(
        before,
      );
    } finally {
      ASSETS.hair.reverse();
      ASSETS.outfit.reverse();
    }
  });
});

describe('backward compatibility', () => {
  it('gives an unresolvable legacy config nothing to render, so the snapshot takes over', () => {
    const legacy = {
      target: 'female',
      avatarCategory: 4,
      isFullbody: true,
      details: { selectedFullbodyHair: 1 },
    };

    const config = normaliseConfig(legacy);

    expect(config).toBeNull();
    expect(describeUsedAssets(config)).toEqual([]);
  });

  it('still describes a modern config that has been through normalisation', () => {
    const items = describeUsedAssets(normaliseConfig(savedLook));

    expect(row(items, 'hair').assetId).toBe('hair6');
    expect(row(items, 'hairColor').color).toBe('#A33327');
  });
});

describe('humaniseAssetId', () => {
  it('turns file stems into something readable', () => {
    expect(humaniseAssetId('short_pant_2')).toBe('Short pant 2');
    expect(humaniseAssetId('hair6')).toBe('Hair 6');
    expect(humaniseAssetId('base_avatar_3')).toBe('Base avatar 3');
  });

  it('leaves an already-readable id alone', () => {
    expect(humaniseAssetId('suit1')).toBe('Suit 1');
  });

  it('never returns an empty label for a real id', () => {
    for (const base of BASES) expect(humaniseAssetId(base.id).length).toBeGreaterThan(0);
  });
});

describe('default look', () => {
  it('describes every slot the base actually offers', () => {
    const items = describeUsedAssets(defaultConfig(femaleBase));

    expect(row(items, 'hair').status).toBe('ok');
    expect(row(items, 'shoes').status).toBe('ok');
    // Female bases have no skin overlay artwork, so that slot stays empty.
    expect(row(items, 'bodyColor').status).toBe('none');
  });
});
