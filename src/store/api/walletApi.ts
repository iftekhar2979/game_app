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

/**
 * Mirrors what `GET /wallet` actually returns.
 *
 * This used to be declared as `{ coins, availableCoins, heldCoins }` - three
 * fields the server has never sent. Nothing read it yet, so the mismatch was
 * invisible; the first screen to use it would have shown an empty balance with
 * no error to explain why.
 */
export interface WalletBalance {
  coinBalance: number;
  isFrozen: boolean;
  frozenReason: string | null;
}

/** One row of the coin statement. */
export interface CoinTransaction {
  id: string;
  type: 'topup' | 'spend' | 'grant' | 'reversal' | 'adjustment';
  /** Signed: credits positive, debits negative. */
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface CoinTransactionPage {
  data: CoinTransaction[];
  pagination: { nextCursor: string | null; hasMore: boolean };
}

/** Everything the native payment sheet needs. Never carries a secret key. */
export interface TopUpIntentResponse {
  orderId: string;
  clientSecret: string;
  publishableKey: string;
  coins: number;
  priceAmount: number;
  currency: string;
  displayName: string;
}

/** An order as the server currently holds it. */
export interface CoinOrder {
  orderId: string;
  status: 'pending' | 'paid' | 'credited' | 'failed' | 'expired' | 'refunded';
  packageSku: string;
  coins: number;
  priceAmount: number;
  currency: string;
  creditedAt: string | null;
  failureReason: string | null;
  coinBalance: number;
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

    /**
     * The coin statement, newest first. Pages accumulate into one cache entry
     * so "load more" appends rather than replacing what is on screen.
     */
    getWalletTransactions: builder.query<
      CoinTransactionPage,
      { before?: string; limit?: number } | void
    >({
      query: (arg) => ({
        url: '/wallet/transactions',
        params: {
          ...(arg && arg.before ? { before: arg.before } : {}),
          limit: (arg && arg.limit) || 30,
        },
      }),
      transformResponse: (response: any): CoinTransactionPage => {
        const body = response?.data !== undefined ? response : { data: response };
        return {
          data: Array.isArray(body.data) ? body.data : [],
          pagination: body.pagination ?? { nextCursor: null, hasMore: false },
        };
      },
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (current, incoming, { arg }) => {
        // A first page replaces; a cursor page appends.
        if (!arg || !arg.before) return incoming;
        current.data.push(...incoming.data);
        current.pagination = incoming.pagination;
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.before !== previousArg?.before,
      providesTags: ['Wallet'],
    }),

    /** Opens an in-app payment sheet rather than sending the user to a browser. */
    startTopUpIntent: builder.mutation<TopUpIntentResponse, { sku: string }>({
      query: (body) => ({ url: '/wallet/topup/intent', method: 'POST', body }),
      transformResponse: (response: any) => response?.data ?? response,
    }),

    /**
     * Re-checks an order against the payment provider.
     *
     * The sheet reporting success only means the card was charged; the coins
     * arrive when the webhook lands. Asking the server to reconcile closes the
     * gap when that webhook is slow or never arrives at all.
     */
    reconcileOrder: builder.mutation<CoinOrder, { orderId: string }>({
      query: ({ orderId }) => ({
        url: `/wallet/orders/${orderId}/reconcile`,
        method: 'POST',
      }),
      transformResponse: (response: any) => response?.data ?? response,
      invalidatesTags: ['Wallet'],
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
  useGetWalletTransactionsQuery,
  useStartTopUpIntentMutation,
  useReconcileOrderMutation,
  useStartCheckoutMutation,
} = walletApi;
