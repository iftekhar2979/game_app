import { baseApi } from './baseApi';
import {
  AvatarAssetResponse,
  AvatarCatalogueAsset,
  AvatarCharacter,
  AvatarCharacterResponse,
  toCatalogueLookup,
  toCharacter,
} from './avatarAssetsTransforms';

/**
 * The backend avatar catalogue, scoped to one Base Avatar.
 *
 * The catalogue decides both what exists for a character and what a user is
 * allowed to pick of it. It used to decide only the second: the app fetched
 * every asset in one request and worked out for itself which ones fitted the
 * body, by matching category numbers held in the bundled registry. That is what
 * let one character's garments appear on another, and it is why there is no
 * unscoped listing here to fetch any more.
 *
 * Artwork is still resolved locally where the bundle has it, which is a
 * separate concern and deliberately unchanged: a catalogue row says *whether*
 * something may be worn, `assetSource` says *how it is drawn*. A network
 * failure therefore degrades selection, never rendering.
 *
 * The mapping lives in `avatarAssetsTransforms` so it stays testable without
 * pulling in RTK Query's ESM build.
 */

export type {
  AvatarAssetLifecycle,
  AvatarAssetResponse,
  AvatarCatalogueAsset,
  AvatarCharacter,
} from './avatarAssetsTransforms';

interface Envelope<T> {
  ok: boolean;
  status: number;
  message: string;
  data: T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    nextPage: number | null;
    totalItems: number;
  };
}

export interface PurchaseResult {
  key: string;
  coinBalance: number;
}

/**
 * How many rows one request asks for.
 *
 * Nothing depends on this being large enough to hold a whole wardrobe - the
 * loop below follows `nextPage` until the server says there is none. That is
 * the point: the previous implementation asked for `limit: 100` once and used
 * whatever came back, so the 101st asset simply did not exist as far as the app
 * was concerned, with nothing on screen to say so.
 */
const PAGE_SIZE = 100;

/** Guards against a malformed `nextPage` looping forever. */
const MAX_PAGES = 50;

export const avatarAssetsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * The Base Avatars a player may build on, each with its skin tones.
     *
     * One entry per character rather than per body: three tones of one
     * character are three catalogue rows, and listing them flat reads as three
     * different people.
     */
    getAvatarCharacters: builder.query<AvatarCharacter[], void>({
      query: () => ({ url: '/avatar-assets/characters', method: 'GET' }),
      transformResponse: (response: Envelope<AvatarCharacterResponse[]>) =>
        (response?.data ?? []).map(toCharacter),
      providesTags: ['AvatarAsset'],
    }),

    /**
     * Everything one character may wear, keyed for lookup.
     *
     * Every page is followed, so what the pickers hold is the character's whole
     * wardrobe or a failure - never a silent prefix of it. `queryFn` rather
     * than `query` because that is what lets one endpoint make several requests
     * while still behaving as a single cache entry with a single loading state.
     */
    getAvatarAssetsForCharacter: builder.query<
      Record<string, AvatarCatalogueAsset>,
      string
    >({
      async queryFn(characterId, _api, _extra, fetchWithBQ) {
        const rows: AvatarAssetResponse[] = [];

        for (let page = 1; page <= MAX_PAGES; page += 1) {
          const result = await fetchWithBQ({
            url: '/avatar-assets',
            method: 'GET',
            params: { character: characterId, page, limit: PAGE_SIZE },
          });

          if (result.error) return { error: result.error };

          const envelope = result.data as Envelope<AvatarAssetResponse[]>;
          rows.push(...(envelope?.data ?? []));

          const next = envelope?.pagination?.nextPage;
          if (!next || next <= page) break;
        }

        return { data: toCatalogueLookup(rows) };
      },
      providesTags: ['AvatarAsset'],
    }),

    /**
     * Unlocks a paid asset.
     *
     * The backend debits the coins inside a transaction; the client never does
     * its own arithmetic on the balance. Invalidating `User` is what refreshes
     * the coin count shown on the profile.
     */
    purchaseAvatarAsset: builder.mutation<PurchaseResult, string>({
      query: (key) => ({ url: `/avatar-assets/${key}/purchase`, method: 'POST' }),
      transformResponse: (response: Envelope<PurchaseResult>) => response.data,
      invalidatesTags: ['AvatarAsset', 'User'],
    }),
  }),
});

export const {
  useGetAvatarCharactersQuery,
  useGetAvatarAssetsForCharacterQuery,
  usePurchaseAvatarAssetMutation,
} = avatarAssetsApi;
