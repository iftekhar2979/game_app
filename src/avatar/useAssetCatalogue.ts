import { useCallback, useMemo } from 'react';

import {
  useGetAvatarAssetsForCharacterQuery,
  useGetAvatarCharactersQuery,
} from '../store/api/avatarAssetsApi';
import {
  AssetState,
  AvatarCatalogueAsset,
  AvatarCharacter,
  resolveAssetState,
} from '../store/api/avatarAssetsTransforms';
import { ArtworkCatalogue } from './assetSource';

export type { AssetAvailability, AssetState } from '../store/api/avatarAssetsTransforms';

/**
 * Catalogue state for the editor's pickers, scoped to one Base Avatar.
 *
 * Two requests, deliberately separate. The character list is what the picker
 * chooses a body from; the wardrobe is fetched *for* the chosen character and
 * contains nothing else. Passing `characterId` in rather than fetching the
 * whole catalogue and filtering is the entire point: there is no moment at
 * which this hook holds another character's assets, so no code downstream can
 * accidentally offer one.
 *
 * The rule table for "may this be picked" is `resolveAssetState`, kept pure and
 * tested separately; this hook only supplies it with query state.
 */
export interface AssetCatalogue {
  /** Every Base Avatar, with its tones. Independent of the scoped wardrobe. */
  characters: AvatarCharacter[];
  /** Selection state for one asset key. */
  stateOf: (assetKey: string | null | undefined) => AssetState;
  /**
   * Where artwork comes from, keyed by asset key.
   *
   * Empty until the catalogue answers, which is what makes the drawing
   * fallback correct: every resolver treats an absent row as "draw from the
   * bundle", so a saved avatar renders identically before the request lands
   * and after it fails.
   */
  artwork: ArtworkCatalogue;
  /**
   * This character's wardrobe, keyed by asset key.
   *
   * `artwork` answers "where does this draw from"; this answers "what may this
   * character wear". Empty until the scoped request answers, and empty is a
   * real answer - a character with nothing assigned has nothing to offer, and
   * that must not fall back to anything wider.
   */
  assets: Record<string, AvatarCatalogueAsset>;
  /** True while either request's first load is in flight. */
  isLoading: boolean;
  /** True when the catalogue could not be fetched. */
  isUnavailable: boolean;
  refetch: () => void;
}

export function useAssetCatalogue(characterId?: string | null): AssetCatalogue {
  const characters = useGetAvatarCharactersQuery();

  /**
   * Skipped until a character is known.
   *
   * RTK Query reports a skipped query as neither loading nor errored, so the
   * flags below treat "no character yet" as loading rather than as failure -
   * the editor shows its spinner instead of an error it cannot act on.
   */
  const wardrobe = useGetAvatarAssetsForCharacterQuery(characterId as string, {
    skip: !characterId,
  });

  const assets = useMemo(() => wardrobe.data ?? {}, [wardrobe.data]);

  /**
   * An empty wardrobe is *not* treated as no wardrobe.
   *
   * This is the one place the old hook was deliberately wrong and now must not
   * be. It treated an empty response as "unseeded, fall back to the bundle",
   * which was reasonable when the response was the whole catalogue. Scoped, an
   * empty response means this character has nothing assigned - a real, correct
   * state for a character an admin created a moment ago - and falling back
   * would hand it somebody else's clothes.
   */
  const hasData = Boolean(wardrobe.data);

  const isLoading =
    characters.isLoading || wardrobe.isLoading || (!!characterId && !wardrobe.data && !wardrobe.isError);

  const stateOf = useCallback(
    (assetKey: string | null | undefined): AssetState =>
      resolveAssetState(assetKey ? assets[assetKey] : undefined, {
        isLoading,
        isError: characters.isError || wardrobe.isError,
        hasData,
      }),
    [assets, hasData, characters.isError, wardrobe.isError, isLoading],
  );

  // `AvatarCatalogueAsset` already carries `imageUrl` and `previewUrl`, so the
  // lookup satisfies `ArtworkCatalogue` structurally with no second mapping.
  const artwork: ArtworkCatalogue = assets;

  const refetch = useCallback(() => {
    characters.refetch();
    if (characterId) wardrobe.refetch();
  }, [characters, wardrobe, characterId]);

  return useMemo(
    () => ({
      characters: characters.data ?? [],
      stateOf,
      artwork,
      assets,
      isLoading,
      isUnavailable:
        !isLoading && (characters.isError || wardrobe.isError || !characters.data?.length),
      refetch,
    }),
    [
      characters.data,
      characters.isError,
      wardrobe.isError,
      stateOf,
      artwork,
      assets,
      isLoading,
      refetch,
    ],
  );
}
