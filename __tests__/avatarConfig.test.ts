import { BASES, getAssetById, getBaseById, listFor, REGISTRY_VERSION } from '../src/avatar/registry';
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

describe('registry', () => {
  it('gives every asset a unique id within its slot', () => {
    for (const slot of AVATAR_SLOTS) {
      const ids = listFor(slot, 'female', 4)
        .concat(listFor(slot, 'male', 1), listFor(slot, 'male', 2))
        .map((asset) => asset.id);

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives every base a unique id', () => {
    expect(new Set(BASES.map((b) => b.id)).size).toBe(BASES.length);
  });

  it('only offers parts that match the base target and category', () => {
    for (const asset of listFor('hair', 'male', 2)) {
      expect(asset.target).toBe('male');
      expect(asset.categories).toContain(2);
    }
  });

  it('does not offer female parts for a male base', () => {
    const ids = listFor('outfit', 'male', 1).map((a) => a.id);
    expect(ids).not.toContain('suit1');
  });
});

describe('defaultConfig', () => {
  it('picks the first available part in each slot', () => {
    const config = defaultConfig(femaleBase);

    expect(config.base).toBe('base_avatar_3');
    expect(config.parts.hair).toBe(listFor('hair', 'female', 4)[0].id);
    expect(config.version).toBe(REGISTRY_VERSION);
  });

  it('leaves a slot null when the base has no parts for it', () => {
    // Shoes are female-only artwork today.
    expect(listFor('shoes', 'male', 1)).toHaveLength(0);
    expect(defaultConfig(maleBase).parts.shoes).toBeNull();
  });
});

describe('resolveConfig', () => {
  it('puts the base first and hair last', () => {
    const layers = resolveConfig(defaultConfig(femaleBase));

    expect(layers[0].slot).toBe('base');
    expect(layers[layers.length - 1].slot).toBe('hair');
  });

  it('carries the hair tint onto the hair layer only', () => {
    const config = withHairColor(defaultConfig(femaleBase), '#A33327');
    const layers = resolveConfig(config);

    const hair = layers.find((l) => l.slot === 'hair');
    expect(hair?.tint).toBe('#A33327');
    expect(layers.find((l) => l.slot === 'outfit')?.tint).toBeUndefined();
  });

  it('drops a layer whose asset no longer exists instead of throwing', () => {
    const config: AvatarConfig = {
      ...defaultConfig(femaleBase),
      parts: { ...defaultConfig(femaleBase).parts, hair: 'hair_that_was_deleted' },
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
    expect(isRenderable(defaultConfig(femaleBase))).toBe(true);
    expect(isRenderable({ ...defaultConfig(femaleBase), base: 'gone' })).toBe(false);
  });
});

describe('lookups', () => {
  it('finds a base and an asset by id', () => {
    expect(getBaseById('male_avatar_2')?.category).toBe(2);
    expect(getAssetById('hair', 'hair2')?.target).toBe('female');
  });

  it('returns undefined for unknown ids', () => {
    expect(getBaseById('nope')).toBeUndefined();
    expect(getAssetById('hair', null)).toBeUndefined();
  });
});
