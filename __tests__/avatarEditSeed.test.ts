import { BASES, indexOfAsset, listFor } from '../src/avatar/registry';
import { defaultConfig, normaliseConfig } from '../src/avatar/resolveConfig';
import { AVATAR_SLOTS, AvatarConfig, AvatarSlot } from '../src/avatar/types';

/**
 * Reopening a saved avatar in the editor.
 *
 * The pickers hold an index into `listFor()`, so edit mode has to turn stored
 * ids back into indices. These pin down that the two directions are exact
 * inverses — a look that round-trips through the editor must come back byte for
 * byte, or saving an untouched avatar would quietly change it.
 */

const femaleBase = BASES.find((b) => b.id === 'base_avatar_3')!;
const maleBase = BASES.find((b) => b.id === 'male_avatar_1')!;

/** `idAt` from GenerateAvatarScreen: index -> stored id. */
const idAt = (slot: AvatarSlot, base: typeof femaleBase, index: number | null) =>
  index === null ? null : listFor(slot, base.target, base.category)[index]?.id ?? null;

/** `seed` from GenerateAvatarScreen: stored id -> picker index. */
const seed = (
  slot: AvatarSlot,
  base: typeof femaleBase,
  config: AvatarConfig | null,
  fallback: number | null,
) =>
  config ? indexOfAsset(slot, base.target, base.category, config.parts?.[slot]) : fallback;

describe('indexOfAsset', () => {
  it('is the exact inverse of listFor for every offered part', () => {
    for (const slot of AVATAR_SLOTS) {
      const options = listFor(slot, 'female', 4);

      options.forEach((asset, index) => {
        expect(indexOfAsset(slot, 'female', 4, asset.id)).toBe(index);
      });
    }
  });

  it('returns null for a retired or unknown id, never a stale index', () => {
    expect(indexOfAsset('hair', 'female', 4, 'hair_that_was_deleted')).toBeNull();
    expect(indexOfAsset('hair', 'female', 4, null)).toBeNull();
    expect(indexOfAsset('hair', 'female', 4, undefined)).toBeNull();
  });

  it('does not match a part belonging to another base', () => {
    // `suit1` is female artwork; a male base must not resolve it.
    expect(indexOfAsset('outfit', 'female', 4, 'suit1')).toBe(0);
    expect(indexOfAsset('outfit', 'male', 1, 'suit1')).toBeNull();
  });
});

describe('edit mode seeding', () => {
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

  it('restores every saved part to its picker index', () => {
    expect(seed('hair', femaleBase, savedLook, 0)).toBe(1);
    expect(seed('outfit', femaleBase, savedLook, 0)).toBe(3);
    expect(seed('skirt', femaleBase, savedLook, 0)).toBe(2);
    expect(seed('shoes', femaleBase, savedLook, 0)).toBe(3);
  });

  it('round-trips a saved look back to an identical config', () => {
    const rebuilt: AvatarConfig['parts'] = {};
    for (const slot of AVATAR_SLOTS) {
      rebuilt[slot] = idAt(slot, femaleBase, seed(slot, femaleBase, savedLook, 0));
    }

    expect(rebuilt).toEqual(savedLook.parts);
  });

  it('round-trips the default look too, so re-saving an untouched avatar is a no-op', () => {
    const saved = defaultConfig(maleBase);

    const rebuilt: AvatarConfig['parts'] = {};
    for (const slot of AVATAR_SLOTS) {
      rebuilt[slot] = idAt(slot, maleBase, seed(slot, maleBase, saved, 0));
    }

    expect(rebuilt).toEqual(saved.parts);
  });

  it('keeps a deliberately empty slot empty instead of falling back to option 0', () => {
    const noShoes = { ...savedLook, parts: { ...savedLook.parts, shoes: null } };

    expect(seed('shoes', femaleBase, noShoes, 0)).toBeNull();
    expect(idAt('shoes', femaleBase, seed('shoes', femaleBase, noShoes, 0))).toBeNull();
  });

  it('empties a slot whose art was retired rather than selecting different art', () => {
    const retired = { ...savedLook, parts: { ...savedLook.parts, outfit: 'gone_forever' } };

    expect(seed('outfit', femaleBase, retired, 0)).toBeNull();
  });

  it('restores the hair tint, including "no tint"', () => {
    expect(savedLook.hairColor).toBe('#A33327');
    expect({ ...savedLook, hairColor: null }.hairColor).toBeNull();
  });

  it('restores the skin overlay on a base that uses one', () => {
    const maleLook: AvatarConfig = {
      version: 1,
      base: 'male_avatar_1',
      parts: { bodyColor: 'brown_yellow', skirt: null, shoes: null, outfit: null, hair: null },
      hairColor: null,
    };

    expect(seed('bodyColor', maleBase, maleLook, 0)).toBe(0);
  });
});

describe('create mode is unaffected', () => {
  it('falls back to the first option in every slot when no config is passed', () => {
    for (const slot of AVATAR_SLOTS) {
      expect(seed(slot, femaleBase, null, 0)).toBe(0);
    }
  });

  it('keeps the bodyColor default that only category 1 gets', () => {
    expect(seed('bodyColor', maleBase, null, 0)).toBe(0);
    expect(seed('bodyColor', femaleBase, null, null)).toBeNull();
  });
});

describe('legacy documents', () => {
  it('opens on defaults rather than mis-seeding from the old index shape', () => {
    // The pre-registry client stored indices into a filtered array. Those cannot
    // be mapped back, so `normaliseConfig` rejects them and edit mode falls
    // through to create-mode defaults.
    const legacy = {
      target: 'female',
      avatarCategory: 4,
      isFullbody: true,
      details: { selectedFullbodyHair: 1, selectedShoes: 0 },
    };

    const config = normaliseConfig(legacy);

    expect(config).toBeNull();
    expect(seed('hair', femaleBase, config, 0)).toBe(0);
  });
});
