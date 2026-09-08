import { BASES } from '../src/avatar/registry';
import { resolveParts } from '../src/avatar/partCatalogue';
import { defaultConfig, normaliseConfig } from '../src/avatar/resolveConfig';
import { AVATAR_SLOTS, AvatarConfig, AvatarSlot } from '../src/avatar/types';

/**
 * Reopening a saved avatar in the editor.
 *
 * This file used to be about inverting an index: the pickers held a position in
 * a list, so edit mode had to turn a stored id back into one, and the two
 * directions had to be exact inverses or saving an untouched avatar would
 * quietly change it. The inversion is gone because the index is - a selection
 * is the stored key itself, so the round trip is an identity rather than a pair
 * of lookups that have to agree.
 *
 * What still needs pinning down is the part that never was automatic: a saved
 * key is *confirmed* against this character's wardrobe, so a part that has been
 * retired or unassigned empties its slot instead of quietly resolving to
 * something else.
 */

const femaleBase = BASES.find((b) => b.id === 'base_avatar_3')!;

/** One character's scoped wardrobe, as the server would send it. */
const wardrobe = (...entries: [AvatarSlot, string][]) =>
  entries.reduce<Record<string, any>>((byKey, [slot, key]) => {
    byKey[key] = {
      key,
      slot,
      target: 'female',
      imageUrl: `https://s3/${key}.png`,
      isRetired: false,
      sortOrder: 0,
    };
    return byKey;
  }, {});

const AURORA = wardrobe(
  ['hair', 'aurora_hair_1'],
  ['outfit', 'aurora_shirt_1'],
  ['skirt', 'aurora_skirt_1'],
  ['shoes', 'aurora_shoes_1'],
);

/**
 * `keyIn` from GenerateAvatarScreen: a selection, confirmed against the list.
 * `seed`: the saved key for a slot, or the first option for a new look.
 */
const keyIn = (
  slot: AvatarSlot,
  assets: Record<string, any>,
  assetKey: string | null,
): string | null => {
  if (!assetKey) return null;
  return resolveParts(slot, 'female', assets).some((asset) => asset.id === assetKey)
    ? assetKey
    : null;
};

const seed = (
  slot: AvatarSlot,
  assets: Record<string, any>,
  config: AvatarConfig | null,
  fallbackToFirst: boolean,
): string | null => {
  const options = resolveParts(slot, 'female', assets);

  if (config) {
    const savedId = config.parts?.[slot];
    if (!savedId) return null;
    return options.some((asset) => asset.id === savedId) ? savedId : null;
  }

  return fallbackToFirst && options.length ? options[0].id : null;
};

describe('a saved look round-trips unchanged', () => {
  const saved: AvatarConfig = {
    version: 1,
    base: 'base_avatar_3',
    parts: {
      bodyColor: null,
      hair: 'aurora_hair_1',
      outfit: 'aurora_shirt_1',
      skirt: 'aurora_skirt_1',
      shoes: 'aurora_shoes_1',
    },
    hairColor: '#A33327',
  };

  it('seeds every slot with exactly the key that was saved', () => {
    for (const slot of AVATAR_SLOTS) {
      expect(seed(slot, AURORA, saved, true)).toBe(saved.parts[slot] ?? null);
    }
  });

  it('rebuilds the identical config, so saving an untouched avatar changes nothing', () => {
    const rebuilt: AvatarConfig = {
      ...saved,
      parts: Object.fromEntries(
        AVATAR_SLOTS.map((slot) => [slot, keyIn(slot, AURORA, seed(slot, AURORA, saved, true))]),
      ),
    };

    expect(rebuilt).toEqual(saved);
  });

  /**
   * The failure an index-based seed had and a key-based one cannot.
   *
   * Reordering used to move every selection made against the old order. A key
   * means the same thing whatever position it occupies.
   */
  it('is unaffected by the wardrobe being reordered', () => {
    const reordered = Object.fromEntries(
      Object.entries(AURORA).map(([key, row]) => [key, { ...row, sortOrder: -(row.sortOrder ?? 0) }]),
    );

    for (const slot of AVATAR_SLOTS) {
      expect(seed(slot, reordered, saved, true)).toBe(seed(slot, AURORA, saved, true));
    }
  });

  it('is unaffected by new artwork being added to the character', () => {
    const grown = { ...AURORA, ...wardrobe(['hair', 'aurora_hair_2']) };

    expect(seed('hair', grown, saved, true)).toBe('aurora_hair_1');
  });
});

describe('a saved part that is no longer available', () => {
  const withRetiredHair = {
    ...AURORA,
    aurora_hair_1: { ...AURORA.aurora_hair_1, isRetired: true },
  };

  it('empties the slot rather than resolving to something else', () => {
    const saved: AvatarConfig = {
      version: 1,
      base: 'base_avatar_3',
      parts: { bodyColor: null, hair: 'aurora_hair_1', outfit: 'aurora_shirt_1', skirt: null, shoes: null },
      hairColor: null,
    };

    expect(seed('hair', withRetiredHair, saved, true)).toBeNull();
    // The rest of the look is untouched.
    expect(seed('outfit', withRetiredHair, saved, true)).toBe('aurora_shirt_1');
  });

  it('empties a slot holding another character’s asset', () => {
    // The case an attacker or a stale screen produces. The server refuses it
    // on save too; this is the editor refusing to show it in the first place.
    const saved: AvatarConfig = {
      version: 1,
      base: 'base_avatar_3',
      parts: { bodyColor: null, hair: 'nova_hair_1', outfit: null, skirt: null, shoes: null },
      hairColor: null,
    };

    expect(seed('hair', AURORA, saved, true)).toBeNull();
    expect(keyIn('hair', AURORA, 'nova_hair_1')).toBeNull();
  });
});

describe('a brand-new look', () => {
  it('starts on the first thing this character was assigned in each slot', () => {
    for (const slot of ['hair', 'outfit', 'skirt', 'shoes'] as AvatarSlot[]) {
      expect(seed(slot, AURORA, null, true)).toBe(resolveParts(slot, 'female', AURORA)[0].id);
    }
  });

  it('starts empty in a slot the character owns nothing in', () => {
    expect(seed('bodyColor', AURORA, null, true)).toBeNull();
  });

  it('matches what defaultConfig builds from the same wardrobe', () => {
    const config = defaultConfig(femaleBase, AURORA);

    for (const slot of AVATAR_SLOTS) {
      expect(config.parts[slot] ?? null).toBe(seed(slot, AURORA, null, true));
    }
  });
});

describe('normalisation', () => {
  it('leaves a modern config exactly as it was', () => {
    const saved: AvatarConfig = {
      version: 1,
      base: 'base_avatar_3',
      parts: { bodyColor: null, hair: 'hair6', outfit: 'suit1', skirt: null, shoes: null },
      hairColor: '#A33327',
    };

    expect(normaliseConfig(saved)).toEqual(saved);
  });
});
