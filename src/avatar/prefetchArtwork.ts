import { Image } from 'react-native';

import { ArtworkCatalogue, remoteUrlsOf, sourceForAsset, sourceForBase } from './assetSource';
import { resolveParts } from './partCatalogue';
import { AssetSource, AVATAR_SLOTS, AvatarTarget } from './types';

/**
 * Warming the image cache before remote artwork has to be on screen.
 *
 * Two jobs, same primitive. On entering the editor it hides the pop-in that
 * would otherwise show as parts arrive one by one; before a `ViewShot` capture
 * it is the only reliable way to know a remote layer is actually available,
 * because the tinted hair layer draws through `react-native-svg`, which exposes
 * no load event to wait on.
 *
 * Bundled artwork is skipped entirely — a `require()` handle is already in the
 * binary and has nothing to warm.
 */

/** How long a prefetch pass may take before the caller gives up on it. */
export const PREFETCH_TIMEOUT_MS = 8000;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> =>
  Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ]);

export interface PrefetchOutcome {
  /** True when every remote URL is now cached. */
  ok: boolean;
  /** URLs that failed or did not finish in time. */
  failed: string[];
}

/**
 * Caches every remote URL among `sources`.
 *
 * Never rejects: a caller decides what a partial result means. The editor
 * tolerates one, since a missed prefetch only costs a visible load; the capture
 * path does not, since it would bake a hole into the saved PNG.
 */
export async function prefetchSources(
  sources: (AssetSource | null | undefined)[],
  timeoutMs = PREFETCH_TIMEOUT_MS,
): Promise<PrefetchOutcome> {
  const urls = remoteUrlsOf(sources);
  if (!urls.length) return { ok: true, failed: [] };

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const outcome = await withTimeout(Image.prefetch(url), timeoutMs);
        return { url, ok: outcome !== 'timeout' && outcome !== false };
      } catch {
        return { url, ok: false };
      }
    }),
  );

  const failed = results.filter((result) => !result.ok).map((result) => result.url);
  return { ok: failed.length === 0, failed };
}

/**
 * Every part offered for one base, warmed in a single pass.
 *
 * Called on entering the editor so the pickers and the preview stage draw from
 * cache. Deliberately covers the whole slot list rather than only the selected
 * parts: the user is about to scroll through all of them.
 */
export async function prefetchEditorArtwork(
  target: AvatarTarget,
  category: number,
  baseId: string | null,
  catalogue: ArtworkCatalogue,
): Promise<PrefetchOutcome> {
  const sources: (AssetSource | null)[] = [sourceForBase(baseId, catalogue)];

  for (const slot of AVATAR_SLOTS) {
    // Merged, so uploaded garments are warmed too - they are the ones that
    // actually need it, being fetched over the network rather than read from
    // the bundle.
    for (const asset of resolveParts(slot, target, category, catalogue)) {
      sources.push(sourceForAsset(slot, asset.id, catalogue));
    }
  }

  return prefetchSources(sources);
}
