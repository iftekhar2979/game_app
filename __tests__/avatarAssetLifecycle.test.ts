import fs from 'fs';
import path from 'path';

import { ASSETS, BASES } from '../src/avatar/registry';
import { resolveConfig, normaliseConfig } from '../src/avatar/resolveConfig';
import {
  AVATAR_SLOTS,
  AvatarAsset,
  AvatarConfig,
  AvatarLayer,
  AvatarSlot,
} from '../src/avatar/types';

/**
 * Asset-lifecycle guarantees for saved avatars.
 *
 * A saved `avatarConfig` is a set of stable ids, so the catalogue must be able
 * to grow, get reordered, get renamed, or have parts retired without changing
 * or breaking any look a user already saved. These tests pin that down by
 * rebuilding the resolver against a mutated copy of the registry.
 */

/** Resolve a config against an arbitrary asset table, mirroring resolveConfig. */
function resolveAgainst(
  config: AvatarConfig,
  assets: Record<AvatarSlot, AvatarAsset[]>,
) {
  const base = BASES.find((b) => b.id === config.base);
  if (!base) return [];

  const layers: AvatarLayer[] = [{ slot: 'base', assetId: base.id, source: base.source }];
  for (const slot of AVATAR_SLOTS) {
    const id = config.parts?.[slot];
    if (!id) continue;
    const asset = (assets[slot] || []).find((a) => a.id === id);
    if (!asset) continue;
    layers.push({
      slot,
      assetId: asset.id,
      source: asset.source,
      ...(slot === 'hair' ? { tint: config.hairColor ?? null } : {}),
    } as any);
  }
  return layers;
}

const femaleBase = BASES.find((b) => b.id === 'base_avatar_3')!;

/** A look a user saved before any catalogue change. */
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

const clone = (): Record<AvatarSlot, AvatarAsset[]> =>
  Object.fromEntries(
    AVATAR_SLOTS.map((slot) => [slot, [...ASSETS[slot]]]),
  ) as Record<AvatarSlot, AvatarAsset[]>;

describe('step 20/21 — reordering the catalogue', () => {
  it('leaves an already-saved look byte-for-byte identical', () => {
    const before = resolveConfig(savedLook);

    const reordered = clone();
    for (const slot of AVATAR_SLOTS) reordered[slot].reverse();
    const after = resolveAgainst(savedLook, reordered);

    expect(after).toEqual(before);
  });

  it('keeps paint order driven by AVATAR_SLOTS, not by array position', () => {
    const shuffled = clone();
    for (const slot of AVATAR_SLOTS) shuffled[slot].reverse();

    expect(resolveAgainst(savedLook, shuffled).map((l) => l.slot)).toEqual(
      resolveConfig(savedLook).map((l) => l.slot),
    );
  });
});

describe('step 22/23 — renaming an asset', () => {
  it('drops only the renamed layer; the rest of the look survives', () => {
    const renamed = clone();
    renamed.hair = renamed.hair.map((a) =>
      a.id === 'hair6' ? { ...a, id: 'hair6_v2' } : a,
    );

    const layers = resolveAgainst(savedLook, renamed);

    // The renamed part can no longer be found by its old id.
    expect(layers.find((l) => l.slot === 'hair')).toBeUndefined();
    // Everything else still renders, and the avatar is still drawable.
    expect(layers.find((l) => l.slot === 'base')).toBeDefined();
    expect(layers.map((l) => l.assetId)).toEqual(
      expect.arrayContaining(['base_avatar_3', 'short_pant_2', 'shoe_1', 'necksleb_1']),
    );
  });

  it('is lossless when the id is kept and only the artwork path changes', () => {
    const repathed = clone();
    repathed.hair = repathed.hair.map((a) =>
      a.id === 'hair6' ? { ...a, source: 999999 } : a,
    );

    const layers = resolveAgainst(savedLook, repathed);
    const hair = layers.find((l) => l.slot === 'hair');

    expect(hair?.assetId).toBe('hair6');
    expect(hair?.source).toBe(999999);
  });
});

describe('step 24/25 — deactivating an asset', () => {
  it('keeps historical avatars renderable after a part is retired', () => {
    const retired = clone();
    retired.outfit = retired.outfit.filter((a) => a.id !== 'necksleb_1');

    const layers = resolveAgainst(savedLook, retired);

    expect(layers.length).toBeGreaterThan(0);
    expect(layers.find((l) => l.slot === 'outfit')).toBeUndefined();
    expect(layers.find((l) => l.slot === 'hair')?.assetId).toBe('hair6');
  });

  it('survives every part being retired at once, leaving the base', () => {
    const empty = Object.fromEntries(
      AVATAR_SLOTS.map((s) => [s, [] as AvatarAsset[]]),
    ) as unknown as Record<AvatarSlot, AvatarAsset[]>;

    const layers = resolveAgainst(savedLook, empty);

    expect(layers).toHaveLength(1);
    expect(layers[0].slot).toBe('base');
  });

  it('normalises a retired id to null rather than carrying a dangling reference', () => {
    const result = normaliseConfig({
      ...savedLook,
      parts: { ...savedLook.parts, outfit: 'retired_outfit' },
    });

    expect(result?.parts.outfit).toBeNull();
    expect(result?.parts.hair).toBe('hair6');
  });
});

describe('the editor screens draw from the registry, not their own copies', () => {
  /**
   * These two screens used to keep private copies of every asset list - the
   * hair and outfit lists twice over in `GenerateAvatarScreen`, as separate
   * half-body and full-body arrays. The registry owned the *ids* while the
   * screens owned the *artwork*, and a test had to pin the two orders together
   * because `idAt()` maps a picker index back to an id through `listFor()`.
   *
   * That duplication is gone, and this replaces the order check that guarded
   * it. The invariant now is simpler and stricter: a screen that reaches for a
   * bundled PNG directly cannot show uploaded artwork no matter what the
   * catalogue says, so it must not reach for one at all.
   */
  const screens = ['GenerateAvatarScreen', 'ExploreAvatarScreen'] as const;

  const sourceOf = (screen: string) =>
    fs.readFileSync(
      path.join(__dirname, `../src/screens/Avatar/${screen}.tsx`),
      'utf8',
    );

  it.each(screens)('%s requires no avatar artwork of its own', (screen) => {
    const requires = sourceOf(screen).match(/require\(['"][^'"]*assets\/images\/avatar[^'"]*['"]\)/g);

    expect(requires ?? []).toEqual([]);
  });

  it.each(screens)('%s resolves artwork through the shared resolver', (screen) => {
    expect(sourceOf(screen)).toMatch(/from '\.\.\/\.\.\/avatar\/assetSource'/);
  });

  /**
   * `idAt` maps a picker index back to an id through the same list the picker
   * rendered, so every list must come from one resolver - not a filtered copy
   * that happens to agree today. `optionsFor` is that single source; it wraps
   * `resolveParts`, which merges the catalogue over the bundled registry.
   */
  it('GenerateAvatarScreen builds every picker list with one resolver', () => {
    const source = sourceOf('GenerateAvatarScreen');

    for (const slot of ['hair', 'outfit', 'skirt', 'shoes', 'bodyColor']) {
      expect(source).toContain(`optionsFor('${slot}')`);
    }

    expect(source).toContain('resolveParts');
    // A second, unmerged source of options would silently desynchronise the
    // indices from the ids.
    expect(source).not.toMatch(/listFor\(/);
  });

  /**
   * The skin-tone layer was drawn only when `avatarCategory === 1`, because
   * that was the only body with skin-tone artwork when it was written. Once a
   * tone can be uploaded for any body, the number stops standing in for "has a
   * tone" - and the mismatch was invisible in the worst way: the picker
   * accepted the choice, the config saved it, and the profile and roster drew
   * it, while the editor that had just refused to show it looked broken.
   */
  it('GenerateAvatarScreen draws a skin tone whenever one resolved', () => {
    const source = sourceOf('GenerateAvatarScreen');

    expect(source).toContain('{bodyColorArt.source && (');
    expect(source).not.toMatch(/avatarCategory === 1/);
  });

  /**
   * Explore hands over a character, not a body, so the editor owns the choice
   * between its tones - and switching swaps the body itself rather than
   * painting an overlay, so the artwork shown is always the one that was drawn.
   */
  it('GenerateAvatarScreen switches between the tones of a character', () => {
    const source = sourceOf('GenerateAvatarScreen');

    expect(source).toContain('variantsOf');
    expect(source).toContain('setChosenBaseId(variant.id)');
    // Nothing to choose from one tone, so the row is not shown.
    expect(source).toContain('bodyVariants.length > 1');
  });

  it('ExploreAvatarScreen lists characters rather than every tone', () => {
    const source = sourceOf('ExploreAvatarScreen');

    expect(source).toContain('groupByCharacter');
    expect(source).toContain('character.primary');
  });

  /**
   * A body only shows the slots something was drawn for. A heading over an
   * empty row reads as artwork failing to load rather than as artwork nobody
   * has made yet - and a base given its own category legitimately starts with
   * every slot empty.
   */
  it('GenerateAvatarScreen hides a picker with nothing in it', () => {
    const source = sourceOf('GenerateAvatarScreen');

    for (const list of [
      'HAIR_STYLES',
      'BLAZERS',
      'FULLBODY_HAIR',
      'FULLBODY_SKIRTS',
      'FULLBODY_OUTFITS',
      'SHOES',
      'BODY_COLORS',
    ]) {
      expect(source).toContain(`{${list}.length > 0 &&`);
    }
  });

  it('GenerateAvatarScreen says so when a body has no wardrobe at all', () => {
    const source = sourceOf('GenerateAvatarScreen');

    expect(source).toContain('hasAnyWardrobe');
    expect(source).toContain('Nothing to wear yet');
  });

  it('GenerateAvatarScreen inverts an index with that same resolver', () => {
    const source = sourceOf('GenerateAvatarScreen');

    expect(source).toMatch(/optionsFor\(slot, activeBase\.target, activeBase\.category\)/);
  });
});
