import type { AvatarCatalogueAsset } from '../store/api/avatarAssetsTransforms';
import { BASES, getBaseById } from './registry';
import { AssetSource, AvatarBase, AvatarTarget } from './types';

/**
 * The base bodies a player may build on, from the catalogue and the bundle.
 *
 * The base picker read the hardcoded `BASES` array, so a base uploaded through
 * the dashboard was stored and served correctly and simply never appeared. The
 * list is now the catalogue's, with the bundle as its fallback rather than its
 * source of truth.
 *
 * Merging rather than replacing is deliberate. The bundle is what the app can
 * draw with no network at all, and a catalogue that is empty, stale or
 * unreachable must leave the editor exactly as it was - so a bundled base stays
 * listed until the catalogue actively says otherwise.
 */

/**
 * Catalogue rows keyed by asset key, as `useAssetCatalogue` holds them.
 *
 * Deliberately permissive: `ArtworkCatalogue` and this are the same object at
 * runtime - the hook hands the one lookup to both - and every reader here
 * guards on the fields it needs, so accepting a looser row is honest rather
 * than a cast that claims more than is known.
 */
export type CatalogueAssets = Record<string, Partial<AvatarCatalogueAsset> | undefined>;

/**
 * A base's category is the single number it *is*, stored as a one-element
 * array so one compatibility check serves every slot (see the schema comment on
 * `AvatarAsset.categories`). Garments list the categories they fit.
 */
export function categoryOf(asset: Partial<AvatarCatalogueAsset>): number | null {
  const category = asset.categories?.[0];
  return typeof category === 'number' && Number.isFinite(category)
    ? category
    : null;
}

/** Every catalogue row that is a usable base, in catalogue order. */
function catalogueBases(assets: CatalogueAssets): Partial<AvatarCatalogueAsset>[] {
  return Object.entries(assets)
    .filter(([, asset]) => !!asset && asset.slot === 'base')
    .map(([key, asset]) => ({ key, ...(asset as Partial<AvatarCatalogueAsset>) }))
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        String(a.key).localeCompare(String(b.key)),
    );
}

/**
 * Turns one catalogue row into a renderable base.
 *
 * Returns null when nothing could draw it: no uploaded artwork and no bundled
 * file under that key. Listing a base with no artwork would put an invisible
 * body in the picker, which reads as a broken app rather than a missing upload.
 */
function toBase(asset: Partial<AvatarCatalogueAsset>): AvatarBase | null {
  const category = categoryOf(asset);
  if (category === null || !asset.key || !asset.target) return null;

  const bundled = getBaseById(asset.key);
  const source = asset.imageUrl ? { uri: asset.imageUrl } : bundled?.source;
  if (!source) return null;

  return {
    id: asset.key,
    target: asset.target as AvatarTarget,
    category,
    isFullbody: asset.isFullbody ?? bundled?.isFullbody ?? true,
    source,
    characterId: asset.characterId ?? null,
    bodyColorId: asset.bodyColorId ?? null,
    blinkEnabled: asset.blinkEnabled ?? true,
    // Absent leaves these null, and the renderer falls back to the bundled
    // overlays - which is what every body that shipped with the app uses.
    normalEyeSource: asset.normalEyeUrl ? { uri: asset.normalEyeUrl } : null,
    blinkEyeSource: asset.blinkEyeUrl ? { uri: asset.blinkEyeUrl } : null,
  };
}

/**
 * The bases to offer, catalogue first.
 *
 * - A catalogue row wins over the bundled entry of the same key, so an admin
 *   re-skinning or re-categorising an existing base takes effect immediately.
 * - A catalogue-only base is appended, which is the whole point of this.
 * - A retired base is dropped, and so is one nothing can draw.
 * - A bundled base the catalogue has never heard of is kept, because an
 *   unseeded or unreachable catalogue must not empty the picker.
 */
export function resolveBases(assets?: CatalogueAssets | null): AvatarBase[] {
  const rows = assets ? catalogueBases(assets) : [];

  // No catalogue at all: the bundle is the whole answer.
  if (!rows.length) return [...BASES];

  const listed = new Set<string>();
  const resolved: AvatarBase[] = [];

  for (const row of rows) {
    listed.add(String(row.key));
    if (row.isRetired) continue;

    const base = toBase(row);
    if (base) resolved.push(base);
  }

  // Bundled bases the catalogue does not mention. Retired ones are not here by
  // definition - the catalogue is the only thing that can retire anything.
  const unlisted = BASES.filter((base) => !listed.has(base.id));

  return [...resolved, ...unlisted];
}

/**
 * One base by id, wherever it is described.
 *
 * Rendering a *saved* avatar goes through here, so it deliberately ignores
 * retirement: withdrawing a base stops it being chosen, it does not un-draw the
 * avatars already built on it.
 */
export function resolveBaseById(
  id?: string | null,
  assets?: CatalogueAssets | null,
): AvatarBase | undefined {
  if (!id) return undefined;

  const row = assets?.[id];
  if (row && row.slot === 'base') {
    const base = toBase({ key: id, ...row });
    if (base) return base;
  }

  return getBaseById(id);
}

/**
 * Whether any garment in the catalogue fits this base.
 *
 * A base introduced with a category no garment lists has nothing to wear, which
 * is correct - artwork is drawn for a specific silhouette and must not be
 * widened automatically - but it is worth being able to say so out loud rather
 * than leaving an admin to discover an undressable body.
 */
export function hasCompatibleGarments(
  base: Pick<AvatarBase, 'target' | 'category'>,
  assets?: CatalogueAssets | null,
): boolean {
  return Object.values(assets ?? {}).some(
    (asset) =>
      !!asset &&
      asset.slot !== 'base' &&
      !asset.isRetired &&
      asset.target === base.target &&
      (asset.categories ?? []).includes(base.category),
  );
}

/**
 * The colour variants of one character, in display order.
 *
 * A character offered in three tones is three bases - three keys to price,
 * retire and save against - which is what lets the app show a skin-tone switch
 * without either key having to encode the other. A base with no `characterId`
 * stands alone and is its own only variant.
 */
export function variantsOf(
  base: Pick<AvatarBase, 'id' | 'characterId'>,
  bases: AvatarBase[],
): AvatarBase[] {
  if (!base.characterId) {
    return bases.filter((candidate) => candidate.id === base.id);
  }

  return bases.filter((candidate) => candidate.characterId === base.characterId);
}

/**
 * The eye overlays to blink with, catalogue first.
 *
 * Returns null when the body does not blink at all, which is a real choice an
 * admin can make rather than a missing asset.
 */
export function blinkSourcesFor(
  base: Pick<AvatarBase, 'blinkEnabled' | 'normalEyeSource' | 'blinkEyeSource'>,
): { normal: AssetSource | null; blink: AssetSource | null } | null {
  if (base.blinkEnabled === false) return null;

  return {
    normal: base.normalEyeSource ?? null,
    blink: base.blinkEyeSource ?? null,
  };
}
