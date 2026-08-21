import fs from 'fs';
import path from 'path';

import { ASSETS, BASES, listFor } from '../src/avatar/registry';
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

describe('editor picker order must match the registry', () => {
  /**
   * GenerateAvatarScreen still keeps its own copies of the asset lists and
   * stores the picker *index*, which `idAt()` maps back to an id through
   * `listFor()`. That mapping is only correct while both orders agree, so
   * reordering one list alone would silently save the wrong artwork.
   */
  const lines = fs
    .readFileSync(
      path.join(__dirname, '../src/screens/Avatar/GenerateAvatarScreen.tsx'),
      'utf8',
    )
    .split('\n');

  /** Entries of one `const NAME: AvatarAsset[] = [ ... ];` block, in order. */
  function localOrder(name: string, target: string, category: number): string[] {
    const start = lines.findIndex((l) => l.startsWith('const ' + name));
    if (start < 0) throw new Error('could not find ' + name);

    const out: string[] = [];
    for (let i = start + 1; i < lines.length && !lines[i].startsWith('];'); i++) {
      const line = lines[i];
      const stem = line.match(/([\w ().\[\]-]+)\.png'\)/);
      const tgt = line.match(/target:\s*'(\w+)'/);
      const cats = line.match(/avatarCategories:\s*\[([\d,\s]+)\]/);
      if (!stem || !tgt || !cats) continue;

      const categories = cats[1].split(',').map((n) => Number(n.trim()));
      if (tgt[1] === target && categories.includes(category)) out.push(stem[1]);
    }
    return out;
  }

  const cases: Array<[string, AvatarSlot, 'female' | 'male', number]> = [
    ['ALL_FULLBODY_HAIR', 'hair', 'female', 4],
    ['ALL_FULLBODY_HAIR', 'hair', 'male', 1],
    ['ALL_FULLBODY_HAIR', 'hair', 'male', 2],
    ['ALL_FULLBODY_OUTFITS', 'outfit', 'female', 4],
    ['ALL_FULLBODY_OUTFITS', 'outfit', 'male', 1],
    ['ALL_FULLBODY_OUTFITS', 'outfit', 'male', 2],
    ['ALL_FULLBODY_SKIRTS', 'skirt', 'female', 4],
    ['ALL_FULLBODY_SKIRTS', 'skirt', 'male', 1],
    ['ALL_FULLBODY_SKIRTS', 'skirt', 'male', 2],
    ['ALL_SHOES', 'shoes', 'female', 4],
    ['ALL_BODY_COLORS', 'bodyColor', 'male', 1],
  ];

  // Registry ids are the artwork file stems, so an id doubles as its stem.
  it.each(cases)(
    '%s is index-aligned with listFor(%s, %s, %i)',
    (arrayName, slot, target, category) => {
      expect(localOrder(arrayName, target, category).map((s) => s.toLowerCase())).toEqual(
        listFor(slot, target, category).map((a) => a.id.toLowerCase()),
      );
    },
  );
});
