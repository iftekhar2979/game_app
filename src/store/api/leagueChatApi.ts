import { baseApi } from './baseApi';

export interface LeagueChatSender {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatarConfig?: Record<string, unknown> | null;
}

export interface LeagueChatMessage {
  id: string;
  leagueId: string;
  text: string;
  clientMessageId: string | null;
  createdAt: string;
  isMine?: boolean;
  sender: LeagueChatSender;
}

export interface LeagueChatPage {
  messages: LeagueChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface LeagueChatUnread {
  leagueId: string;
  lastReadMessageId: string | null;
  unreadCount: number;
}

export interface GetLeagueChatArgs {
  leagueId: string;
  before?: string;
  limit?: number;
}

export const leagueChatApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getLeagueChatMessages: builder.query<LeagueChatPage, GetLeagueChatArgs>({
      query: ({ leagueId, before, limit = 30 }) => ({
        url: `leagues/${leagueId}/chat/messages`,
        params: { limit, ...(before ? { before } : {}) },
      }),
      transformResponse: (response: any): LeagueChatPage => ({
        messages: Array.isArray(response?.data) ? response.data : [],
        nextCursor: response?.pagination?.nextCursor ?? null,
        hasMore: Boolean(response?.pagination?.hasMore),
      }),
      providesTags: (_result, _error, { leagueId }) => [
        { type: 'LeagueChat', id: leagueId },
      ],
    }),
    getLeagueChatUnread: builder.query<LeagueChatUnread, string>({
      query: leagueId => ({ url: `leagues/${leagueId}/chat/unread` }),
      transformResponse: (response: any, _meta, leagueId): LeagueChatUnread => {
        const data = response?.data ?? response ?? {};
        return {
          leagueId: String(data.leagueId ?? leagueId),
          lastReadMessageId: data.lastReadMessageId ?? null,
          unreadCount: Number(data.unreadCount ?? 0),
        };
      },
      providesTags: (_result, _error, leagueId) => [
        { type: 'LeagueChat', id: `${leagueId}-unread` },
      ],
    }),
    markLeagueChatRead: builder.mutation<
      LeagueChatUnread,
      { leagueId: string; upToMessageId?: string }
    >({
      query: ({ leagueId, upToMessageId }) => ({
        url: `leagues/${leagueId}/chat/read`,
        method: 'POST',
        body: upToMessageId ? { upToMessageId } : {},
      }),
      transformResponse: (response: any, _meta, { leagueId }) => {
        const data = response?.data ?? response ?? {};
        return {
          leagueId: String(data.leagueId ?? leagueId),
          lastReadMessageId: data.lastReadMessageId ?? null,
          unreadCount: Number(data.unreadCount ?? 0),
        };
      },
      invalidatesTags: (_result, _error, { leagueId }) => [
        { type: 'LeagueChat', id: `${leagueId}-unread` },
      ],
    }),
    sendLeagueChatMessage: builder.mutation<
      LeagueChatMessage,
      { leagueId: string; text: string; clientMessageId: string }
    >({
      query: ({ leagueId, ...body }) => ({
        url: `leagues/${leagueId}/chat/messages`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response?.data ?? response,
    }),
  }),
});

export const {
  useLazyGetLeagueChatMessagesQuery,
  useGetLeagueChatUnreadQuery,
  useMarkLeagueChatReadMutation,
  useSendLeagueChatMessageMutation,
} = leagueChatApi;
