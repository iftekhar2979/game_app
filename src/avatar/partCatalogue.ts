import type { AvatarCatalogueAsset } from '../store/api/avatarAssetsTransforms';
import type { CatalogueAssets } from './baseCatalogue';
import { getAssetById, listFor } from './registry';
import { AvatarAsset, AvatarSlot, AvatarTarget } from './types';

/**
 * The garments a body can wear, from the catalogue and the bundle.
 *
 * `listFor` reads the bundled arrays, so a shirt, pant, shoe or hairstyle
 * uploaded through the dashboard was served correctly and never appeared in the
 * pickers. This merges the catalogue in, the same way `baseCatalogue` does for
 * bodies.
 *
 * The ordering rule matters more here than it does for bases. The editor's
 * pickers hold an **index** into this list, and `idAt`/`indexOfAsset` convert
 * between that index and a stable asset id using the same list. If the order
 * changed when the catalogue arrived, a selection made a moment earlier would
 * silently come to mean a different garment.
 *
 * So the bundled assets keep their exact positions and catalogue-only assets
 * are appended after them. The prefix a selection was made against never moves.
 */

/** Whether a catalogue row is a garment this body could wear. */
function fitsBase(
  asset: Partial<AvatarCatalogueAsset>,
  slot: AvatarSlot,
  target: AvatarTarget,
  category: number,
): boolean {
  return (
    asset.slot === slot &&
    asset.target === target &&
    (asset.categories ?? []).includes(category) &&
    // Artwork is required: a row with neither an upload nor a bundled file
    // would render as a hole in the picker.
    (!!asset.imageUrl || !!getAssetById(slot, asset.key))
  );
}

/**
 * Every asset offered for one slot on one body.
 *
 * Bundled first, in registry order, then catalogue-only rows by `sortOrder`.
 *
 * A retired *bundled* asset stays listed, because that is what the app already
 * did: the picker dims it through `resolveAssetState` rather than removing it,
 * which keeps indices stable and lets someone who owns it keep wearing it. A
 * retired *catalogue-only* asset is dropped - it never shipped, so nothing is
 * made inconsistent by its absence.
 */
export function resolveParts(
  slot: AvatarSlot,
  target: AvatarTarget,
  category: number,
  assets?: CatalogueAssets | null,
): AvatarAsset[] {
  const bundled = listFor(slot, target, category);
  if (!assets) return bundled;

  const known = new Set(bundled.map((asset) => asset.id));

  const extra = Object.entries(assets)
    .map(([key, row]) => ({ key, ...(row ?? {}) }))
    .filter(
      (row) =>
        !known.has(row.key) &&
        !row.isRetired &&
        fitsBase(row, slot, target, category),
    )
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.key.localeCompare(b.key),
    )
    .map(
      (row): AvatarAsset => ({
        id: row.key,
        target,
        categories: row.categories ?? [category],
        // `imageUrl` is guaranteed by `fitsBase` for a row with no bundled art.
        source: row.imageUrl
          ? { uri: row.imageUrl }
          : (getAssetById(slot, row.key)!.source),
      }),
    );

  return extra.length ? [...bundled, ...extra] : bundled;
}

/**
 * Whether an asset id is one this app can draw at all.
 *
 * `normaliseConfig` uses it to decide whether a saved part still exists. It has
 * to consult the catalogue as well as the bundle, or a look wearing a
 * dashboard-uploaded shirt would come back with that slot emptied.
 */
export function isKnownPart(
  slot: AvatarSlot,
  id?: string | null,
  assets?: CatalogueAssets | null,
): boolean {
  if (!id) return false;
  if (getAssetById(slot, id)) return true;

  const row = assets?.[id];
  return !!row && row.slot === slot && !!row.imageUrl;
}
