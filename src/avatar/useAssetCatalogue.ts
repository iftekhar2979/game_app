import { useCallback, useMemo } from 'react';

import { useGetAvatarAssetsQuery } from '../store/api/avatarAssetsApi';
import { AssetState, resolveAssetState } from '../store/api/avatarAssetsTransforms';
import { ArtworkCatalogue } from './assetSource';

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

  return useMemo(
    () => ({
      stateOf,
      artwork,
      isLoading,
      isUnavailable: !isLoading && (isError || !hasData),
      refetch,
    }),
    [stateOf, artwork, isLoading, isError, hasData, refetch],
  );
}
