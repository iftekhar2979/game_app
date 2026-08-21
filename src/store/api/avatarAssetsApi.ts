import { baseApi } from './baseApi';
import {
  AvatarAssetResponse,
  AvatarCatalogueAsset,
  toCatalogueLookup,
} from './avatarAssetsTransforms';

/**
 * The backend avatar catalogue.
 *
 * This decides what a user is *allowed* to pick — free, owned, purchasable or
 * retired. It deliberately does not decide what gets drawn: artwork still comes
 * from the bundled registry, keyed by the same stable ids, so the editor and
 * every saved avatar keep rendering with no network at all.
 *
 * The mapping itself lives in `avatarAssetsTransforms` so it stays testable
 * without pulling in RTK Query's ESM build.
 */

export type {
  AvatarAssetLifecycle,
  AvatarAssetResponse,
  AvatarCatalogueAsset,
} from './avatarAssetsTransforms';

interface Envelope<T> {
  ok: boolean;
  status: number;
  message: string;
  data: T;
}

export interface PurchaseResult {
  key: string;
  coinBalance: number;
}

export const avatarAssetsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * The whole catalogue, keyed for lookup.
     *
     * Fetched in one page: there are ~50 assets and the editor needs all of
     * them at once to render its pickers, so paging would only add states to
     * handle for no benefit.
     */
    getAvatarAssets: builder.query<Record<string, AvatarCatalogueAsset>, void>({
      query: () => ({ url: '/avatar-assets', method: 'GET', params: { page: 1, limit: 100 } }),
      transformResponse: (response: Envelope<AvatarAssetResponse[]>) =>
        toCatalogueLookup(response?.data),
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

export const { useGetAvatarAssetsQuery, usePurchaseAvatarAssetMutation } = avatarAssetsApi;
