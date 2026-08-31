import { baseApi } from './baseApi';

export interface CoinPackage {
  _id?: string;
  sku: string;
  displayName: string;
  coins: number;
  bonusCoins?: number;
  priceAmount: number; // in cents (e.g. 400 = $4.00)
  currency: string;
  sortOrder?: number;
}

export interface WalletBalance {
  coins: number;
  availableCoins: number;
  heldCoins: number;
}

export interface CheckoutSessionResponse {
  orderId: string;
  checkoutUrl: string;
  expiresAt: string;
}

export const walletApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCoinPackages: builder.query<CoinPackage[], void>({
      query: () => '/coin-packages',
      transformResponse: (response: any) => {
        const raw = response?.data !== undefined ? response.data : response;
        return Array.isArray(raw) ? raw : [];
      },
      providesTags: ['CoinPackage'],
    }),

    getWalletBalance: builder.query<WalletBalance, void>({
      query: () => '/wallet',
      transformResponse: (response: any) => response?.data ?? response,
      providesTags: ['Wallet'],
    }),

    startCheckout: builder.mutation<CheckoutSessionResponse, { sku: string }>({
      query: (body) => ({
        url: '/wallet/topup/checkout',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response?.data ?? response,
      invalidatesTags: ['Wallet'],
    }),
  }),
});

export const {
  useGetCoinPackagesQuery,
  useGetWalletBalanceQuery,
  useStartCheckoutMutation,
} = walletApi;
