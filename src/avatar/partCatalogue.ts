import type { AvatarCatalogueAsset } from '../store/api/avatarAssetsTransforms';
import type { CatalogueAssets } from './baseCatalogue';
import { getAssetById } from './registry';
import { AvatarAsset, AvatarSlot, AvatarTarget } from './types';

/**
 * The garments one Base Avatar can wear.
 *
 * The catalogue is the whole list. That is the change: this used to start from
 * `listFor(slot, target, category)` - the hardcoded arrays in `registry.ts` -
 * and merely *append* catalogue rows to them. The bundled prefix was filtered
 * by category number alone and never consulted the body being dressed, so every
 * bundled garment carrying a matching number appeared on any character carrying
 * it. Two characters that happened to share a number shared a wardrobe, and no
 * amount of care in the appended half could undo that.
 *
 * So the bundle is now a *renderer* and never a *lister*. `getAssetById` still
 * resolves artwork for a row whose upload has not happened yet, which is what
 * keeps every migrated asset drawing exactly as it did; but a row has to be in
 * the character's scoped response to be offered at all.
 *
 * There is deliberately no fallback for an empty or failed response. A
 * character whose wardrobe could not be fetched shows nothing, which is honest;
 * falling back to the bundle would mean falling back to the category matching
 * this exists to remove, and it would do so precisely when nobody is watching.
 */

/** A row that can actually be drawn, in the slot being asked for. */
function drawable(
  asset: Partial<AvatarCatalogueAsset>,
  slot: AvatarSlot,
): boolean {
  if (asset.slot !== slot || !asset.key) return false;

  // Uploaded artwork, or a bundled file under the same stable id. A row with
  // neither would render as a hole in the picker.
  return !!asset.imageUrl || !!getAssetById(slot, asset.key);
}

/**
 * Every asset offered for one slot on one character, in the character's order.
 *
 * `assets` is the scoped catalogue for the character currently being dressed -
 * `useAssetCatalogue` fetches it per character, so there is nothing here that
 * needs to re-check which body a row belongs to. The scoping already happened,
 * on the server, and re-deriving it locally is exactly the mistake this file
 * used to make.
 *
 * A retired row is dropped: it cannot be chosen for a new look. A saved avatar
 * wearing one still renders, because rendering goes through `resolveConfig` and
 * resolves the key directly rather than looking for it in this list.
 */
export function resolveParts(
  slot: AvatarSlot,
  target: AvatarTarget,
  assets?: CatalogueAssets | null,
): AvatarAsset[] {
  if (!assets) return [];

  return Object.entries(assets)
    .map(([key, row]) => ({ key, ...(row ?? {}) }))
    .filter((row) => !row.isRetired && drawable(row, slot))
    .sort(
      (a, b) =>
        // The character's own arrangement first: the server sends the
        // assignment's order, which is what lets a shared garment sit in a
        // different place for each character wearing it.
        (a.assignmentSortOrder ?? a.sortOrder ?? 0) -
          (b.assignmentSortOrder ?? b.sortOrder ?? 0) ||
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.key.localeCompare(b.key),
    )
    .map(
      (row): AvatarAsset => ({
        id: row.key,
        target,
        hasThumbnail: !!row.hasThumbnail,
        // `drawable` guarantees one of these resolves.
        source: row.imageUrl
          ? { uri: row.imageUrl }
          : getAssetById(slot, row.key)!.source,
      }),
    );
}

/**
 * Whether an asset id is one this app can draw at all.
 *
 * `normaliseConfig` uses it to decide whether a saved part still exists, so it
 * consults the bundle as well as the catalogue - a look wearing a
 * dashboard-uploaded shirt must not come back with that slot emptied.
 *
 * Deliberately a question about *drawability*, not about permission. Whether
 * the part may be chosen again is `resolveParts`; whether it can be painted is
 * this, and a saved avatar only needs the second.
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
