import { ASSETS, BASES, getAssetById, getBaseById, REGISTRY_VERSION } from '../src/avatar/registry';
import {
  baseOf,
  defaultConfig,
  emptyConfig,
  isRenderable,
  normaliseConfig,
  resolveConfig,
  withHairColor,
  withPart,
} from '../src/avatar/resolveConfig';
import { AVATAR_SLOTS, AvatarConfig } from '../src/avatar/types';

const femaleBase = BASES.find((b) => b.id === 'base_avatar_3')!;
const maleBase = BASES.find((b) => b.id === 'male_avatar_1')!;

/**
 * The registry is an artwork lookup now, so what is worth asserting about it is
 * that ids stay unique and resolvable - not which parts it "offers", which it
 * no longer decides. `listFor` is gone along with the category matching it did.
 */
describe('registry', () => {
  it('gives every asset a unique id within its slot', () => {
    for (const slot of AVATAR_SLOTS) {
      const ids = (ASSETS[slot] ?? []).map((asset) => asset.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives every base a unique id', () => {
    expect(new Set(BASES.map((b) => b.id)).size).toBe(BASES.length);
  });

  it('gives every bundled body its own character by default', () => {
    // A body nobody has grouped stands alone, which is what all five are until
    // an admin says otherwise. Matches what the seed writes.
    for (const base of BASES) {
      expect(base.characterId).toBe(base.id);
    }
  });
});

/** One character's scoped wardrobe, as the server would send it. */
const wardrobe = (...keys: string[]) =>
  keys.reduce<Record<string, any>>((byKey, key) => {
    const slot = AVATAR_SLOTS.find((candidate) =>
      (ASSETS[candidate] ?? []).some((asset) => asset.id === key),
    )!;
    byKey[key] = {
      key,
      slot,
      target: 'female',
      isRetired: false,
      imageUrl: null,
      sortOrder: 0,
    };
    return byKey;
  }, {});

describe('defaultConfig', () => {
  it('picks the first part this character was assigned in each slot', () => {
    const config = defaultConfig(femaleBase, wardrobe('hair6', 'suit1'));

    expect(config.base).toBe('base_avatar_3');
    expect(config.parts.hair).toBe('hair6');
    expect(config.parts.outfit).toBe('suit1');
    expect(config.version).toBe(REGISTRY_VERSION);
  });

  it('leaves a slot null when the character was assigned nothing for it', () => {
    // The default look is assembled out of this character's own wardrobe, so a
    // slot it owns nothing in stays empty rather than borrowing.
    const config = defaultConfig(femaleBase, wardrobe('hair6'));

    expect(config.parts.hair).toBe('hair6');
    expect(config.parts.shoes).toBeNull();
    expect(config.parts.outfit).toBeNull();
  });

  it('leaves every slot null with no wardrobe at all', () => {
    expect(defaultConfig(maleBase).parts.shoes).toBeNull();
    expect(defaultConfig(maleBase).parts.hair).toBeNull();
  });
});

describe('resolveConfig', () => {
  /** A dressed look needs a wardrobe: parts come from the character's own. */
  const dressed = () => defaultConfig(femaleBase, wardrobe('hair6', 'suit1'));

  it('puts the base first and hair last', () => {
    const layers = resolveConfig(dressed());

    expect(layers[0].slot).toBe('base');
    expect(layers[layers.length - 1].slot).toBe('hair');
  });

  it('carries the hair tint onto the hair layer only', () => {
    const config = withHairColor(dressed(), '#A33327');
    const layers = resolveConfig(config);

    const hair = layers.find((l) => l.slot === 'hair');
    expect(hair?.tint).toBe('#A33327');
    expect(layers.find((l) => l.slot === 'outfit')?.tint).toBeUndefined();
  });

  it('drops a layer whose asset no longer exists instead of throwing', () => {
    const config: AvatarConfig = {
      ...dressed(),
      parts: { ...dressed().parts, hair: 'hair_that_was_deleted' },
    };

    const layers = resolveConfig(config);

    expect(layers.find((l) => l.slot === 'hair')).toBeUndefined();
    // Everything else still renders.
    expect(layers.find((l) => l.slot === 'base')).toBeDefined();
    expect(layers.find((l) => l.slot === 'outfit')).toBeDefined();
  });

  it('returns nothing for an unknown base, since there is no body to draw', () => {
    expect(resolveConfig({ ...defaultConfig(femaleBase), base: 'gone' })).toEqual([]);
    expect(resolveConfig(null)).toEqual([]);
    expect(resolveConfig(undefined)).toEqual([]);
  });

  it('renders only the base for an empty config', () => {
    const layers = resolveConfig(emptyConfig(femaleBase));

    expect(layers).toHaveLength(1);
    expect(layers[0].slot).toBe('base');
  });
});

describe('normaliseConfig', () => {
  it('round-trips a config it produced', () => {
    const config = defaultConfig(maleBase);

    expect(normaliseConfig(config)).toEqual(config);
  });

  it('rejects the legacy index-based shape rather than mapping it wrongly', () => {
    // The old client stored indices into a filtered array. Those cannot be
    // mapped back to assets reliably, so the editor should open on defaults
    // instead of dressing someone in arbitrary clothes.
    const legacy = {
      target: 'female',
      avatarCategory: 4,
      isFullbody: true,
      details: { selectedFullbodyHair: 1, selectedShoes: 0 },
    };

    expect(normaliseConfig(legacy)).toBeNull();
  });

  it('nulls out parts that reference missing assets', () => {
    const result = normaliseConfig({
      version: 1,
      base: 'base_avatar_3',
      parts: { hair: 'nope', outfit: 'suit1' },
      hairColor: '#1A1A1A',
    });

    expect(result?.parts.hair).toBeNull();
    expect(result?.parts.outfit).toBe('suit1');
    expect(result?.hairColor).toBe('#1A1A1A');
  });

  it('handles junk input', () => {
    expect(normaliseConfig(null)).toBeNull();
    expect(normaliseConfig('nope')).toBeNull();
    expect(normaliseConfig({})).toBeNull();
  });

  it('stamps the current registry version', () => {
    const result = normaliseConfig({ version: 0, base: 'male_avatar_1', parts: {} });

    expect(result?.version).toBe(REGISTRY_VERSION);
  });
});

describe('editing helpers', () => {
  it('sets a part immutably', () => {
    const config = defaultConfig(femaleBase);
    const next = withPart(config, 'outfit', 'necksleb_1');

    expect(next.parts.outfit).toBe('necksleb_1');
    expect(config.parts.outfit).not.toBe('necksleb_1');
  });

  it('clears a part when passed null', () => {
    expect(withPart(defaultConfig(femaleBase), 'shoes', null).parts.shoes).toBeNull();
  });

  it('resolves the base of a config', () => {
    expect(baseOf(defaultConfig(maleBase))?.id).toBe('male_avatar_1');
    expect(baseOf(null)).toBeUndefined();
  });

  it('reports renderability', () => {
    const config = defaultConfig(femaleBase, wardrobe('hair6', 'suit1'));

    expect(isRenderable(config)).toBe(true);
    expect(isRenderable({ ...config, base: 'gone' })).toBe(false);
  });
});

describe('lookups', () => {
  it('finds a base and an asset by id', () => {
    expect(getBaseById('male_avatar_2')?.characterId).toBe('male_avatar_2');
    expect(getAssetById('hair', 'hair2')?.target).toBe('female');
  });

  it('returns undefined for unknown ids', () => {
    expect(getBaseById('nope')).toBeUndefined();
    expect(getAssetById('hair', null)).toBeUndefined();
  });
});
