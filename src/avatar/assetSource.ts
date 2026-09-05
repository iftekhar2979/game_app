import { getAssetById, getBaseById } from './registry';
import { AssetSource, AvatarSlot, isRemoteSource } from './types';

/**
 * Where a layer's artwork comes from: uploaded, or bundled.
 *
 * One rule, applied everywhere — **remote wins, bundled is the fallback**. That
 * ordering is what lets artwork migrate to S3 one asset at a time: a catalogue
 * row that gains an `imageUrl` starts serving remotely with no client release,
 * and an asset that never gets one keeps drawing from the bundle forever.
 *
 * Kept pure and free of React Native imports so the rule can be tested on its
 * own, matching `resolveConfig` and `avatarAssetsTransforms`.
 */

/**
 * The slice of a catalogue row this module needs.
 *
 * Deliberately structural rather than importing `AvatarCatalogueAsset`: the
 * artwork rule depends on two URL fields and nothing else, and keeping it that
 * way means the avatar layer does not take a dependency on the store.
 */
export interface RemoteArtwork {
  /** Full-resolution layer artwork. */
  imageUrl?: string | null;
  /** Smaller artwork for picker tiles. Falls back to `imageUrl`. */
  previewUrl?: string | null;
}

/** Catalogue rows keyed by stable asset id, as `useAssetCatalogue` holds them. */
export type ArtworkCatalogue = Record<string, RemoteArtwork | undefined>;

const remote = (url?: string | null): AssetSource | null =>
  typeof url === 'string' && url.length > 0 ? { uri: url } : null;

/**
 * Full-resolution artwork for one part.
 *
 * Returns `null` only when there is genuinely nothing to draw — neither an
 * upload nor a bundled file — which is the case a saved look must survive
 * rather than render as a broken image.
 */
export function sourceForAsset(
  slot: AvatarSlot,
  assetId?: string | null,
  catalogue?: ArtworkCatalogue,
): AssetSource | null {
  if (!assetId) return null;
  return remote(catalogue?.[assetId]?.imageUrl) ?? getAssetById(slot, assetId)?.source ?? null;
}

/** Full-resolution artwork for a base body. */
export function sourceForBase(
  baseId?: string | null,
  catalogue?: ArtworkCatalogue,
): AssetSource | null {
  if (!baseId) return null;
  return remote(catalogue?.[baseId]?.imageUrl) ?? getBaseById(baseId)?.source ?? null;
}

/**
 * Thumbnail artwork for a picker tile.
 *
 * Prefers `previewUrl` because the layer PNGs are painted on a full-body canvas
 * and run to several hundred kilobytes each — far too heavy for a scrolling row
 * of 72px tiles. Falls back to the full artwork when no preview was uploaded.
 */
export function previewSourceForAsset(
  slot: AvatarSlot,
  assetId?: string | null,
  catalogue?: ArtworkCatalogue,
): AssetSource | null {
  if (!assetId) return null;

  const row = catalogue?.[assetId];
  return (
    remote(row?.previewUrl) ??
    remote(row?.imageUrl) ??
    getAssetById(slot, assetId)?.source ??
    null
  );
}

/** True when this asset would draw from the network rather than the bundle. */
export function isRemotelyServed(
  slot: AvatarSlot,
  assetId?: string | null,
  catalogue?: ArtworkCatalogue,
): boolean {
  return isRemoteSource(sourceForAsset(slot, assetId, catalogue));
}

/**
 * Every distinct remote URL in a set of sources.
 *
 * Feeds the prefetch pass: bundled handles need no warming, and duplicates are
 * dropped so a look wearing the same artwork twice is fetched once.
 */
export function remoteUrlsOf(sources: (AssetSource | null | undefined)[]): string[] {
  const urls = new Set<string>();

  for (const source of sources) {
    if (isRemoteSource(source)) urls.add(source.uri);
  }

  return [...urls];
}
