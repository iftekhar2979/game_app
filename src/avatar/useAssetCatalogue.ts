import { useCallback, useMemo } from 'react';

import { useGetAvatarAssetsQuery } from '../store/api/avatarAssetsApi';
import { AssetState, resolveAssetState } from '../store/api/avatarAssetsTransforms';

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

  return useMemo(
    () => ({
      stateOf,
      isLoading,
      isUnavailable: !isLoading && (isError || !hasData),
      refetch,
    }),
    [stateOf, isLoading, isError, hasData, refetch],
  );
}
