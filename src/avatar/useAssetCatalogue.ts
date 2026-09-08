import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useGetAvatarAssetsQuery } from '../store/api/avatarAssetsApi';
import {
  AssetState,
  AvatarCatalogueAsset,
  resolveAssetState,
} from '../store/api/avatarAssetsTransforms';
import { ArtworkCatalogue } from './assetSource';
import { describeCatalogueCoverage, formatCoverageWarning } from './catalogueCoverage';

export type { AssetAvailability, AssetState } from '../store/api/avatarAssetsTransforms';

/**
 * Catalogue state for the editor's pickers.
 *
 * Answers one question per asset — may this be picked, and if not, why — while
 * leaving rendering entirely to the bundled registry. That split is what keeps
 * a failed catalogue request from breaking the editor: artwork still draws, and
 * only the *selection* rules degrade.
 *
 * The rule table itself is `resolveAssetState`, kept pure and tested separately;
 * this hook only supplies it with query state.
 */
export interface AssetCatalogue {
  /** Selection state for one bundled asset id. */
  stateOf: (assetKey: string | null | undefined) => AssetState;
  /**
   * Where artwork comes from, keyed by asset id.
   *
   * Empty until the catalogue answers, which is exactly what makes the fallback
   * correct: every resolver treats an absent row as "draw from the bundle", so
   * the editor renders identically before the request lands and after it fails.
   */
  artwork: ArtworkCatalogue;
  /**
   * Every catalogue row, keyed by asset key.
   *
   * `artwork` answers "where does this draw from"; this answers "what exists",
   * which is what lets a list be built from the catalogue rather than only
   * decorated by it. Empty until the catalogue answers.
   */
  assets: Record<string, AvatarCatalogueAsset>;
  /** True while the first load is in flight. */
  isLoading: boolean;
  /** True when the catalogue could not be fetched. */
  isUnavailable: boolean;
  refetch: () => void;
}

export function useAssetCatalogue(): AssetCatalogue {
  const { data, isLoading, isError, refetch } = useGetAvatarAssetsQuery();

  /**
   * An empty catalogue is treated as no catalogue.
   *
   * A successful response listing nothing means the collection has not been
   * seeded yet, and that is indistinguishable from a failure as far as the
   * picker is concerned: every asset would resolve to `unknown` and quietly
   * become unselectable with nothing on screen to say why.
   */
  const hasData = Boolean(data) && Object.keys(data ?? {}).length > 0;

  const stateOf = useCallback(
    (assetKey: string | null | undefined): AssetState =>
      resolveAssetState(assetKey ? data?.[assetKey] : undefined, {
        isLoading,
        isError,
        hasData,
      }),
    [data, hasData, isError, isLoading],
  );

  // `AvatarCatalogueAsset` already carries `imageUrl` and `previewUrl`, so the
  // lookup satisfies `ArtworkCatalogue` structurally with no second mapping.
  const artwork: ArtworkCatalogue = useMemo(() => data ?? {}, [data]);

  /**
   * Say so, loudly and once, when the catalogue does not cover the bundle.
   *
   * The registry and the server's seed list live in separate repositories with
   * nothing keeping them in step, and the failure mode is silent: an unseeded
   * asset draws fine and simply refuses to be picked. Warning here turns a
   * confusing afternoon in the picker into a one-line seed fix.
   *
   * Development only - this is a message to whoever is adding artwork, and
   * there is nothing a player could do about it.
   */
  const warned = useRef<string | null>(null);
  useEffect(() => {
    if (!__DEV__) return;

    const warning = formatCoverageWarning(describeCatalogueCoverage(artwork));
    if (!warning || warned.current === warning) return;

    warned.current = warning;
    console.warn(`[avatar] catalogue does not match the bundled registry:
${warning}`);
  }, [artwork]);

  const assets = useMemo(() => data ?? {}, [data]);

  return useMemo(
    () => ({
      stateOf,
      artwork,
      assets,
      isLoading,
      isUnavailable: !isLoading && (isError || !hasData),
      refetch,
    }),
    [stateOf, artwork, assets, isLoading, isError, hasData, refetch],
  );
}
