import { baseApi } from './baseApi';

export interface NotificationMetadata {
  deepLink?: string;
  screen?: string;
  page?: string;
  relatedType?: 'subscription' | 'quiz_attempt' | 'learning_quiz_attempt' | 'admin_message' | 'post' | 'comment' | string;
  relatedId?: string;
  imageUrl?: string;
  reason?: string;
}

export interface NotificationItem {
  _id: string;
  id?: string;
  recipientId: string;
  senderId?: string;
  category: 'system' | 'billing' | 'quiz' | 'admin' | 'social' | string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: NotificationMetadata;
}

export interface NotificationPagination {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
}

export interface NotificationsResponse {
  message?: string;
  data: NotificationItem[];
  unreadCount?: number;
  pagination?: NotificationPagination;
}

export interface NotificationBadgeResponse {
  message?: string;
  data: {
    unreadCount: number;
    hasUnread: boolean;
  };
}

export interface QueryNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  category?: string;
}

export const notificationApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, QueryNotificationsParams | void>({
      query: (params) => ({
        url: '/notifications',
        method: 'GET',
        params: params || { page: 1, limit: 15 },
      }),
      transformResponse: (response: any): NotificationsResponse => {
        const rawData = response?.data || [];
        const rawPagination = response?.pagination || {};
        const unreadCount = response?.unreadCount ?? 0;

        const data: NotificationItem[] = (Array.isArray(rawData) ? rawData : []).map(
          (item: any) => ({
            _id: item._id || item.id,
            id: item.id || item._id,
            recipientId: item.recipientId,
            senderId: item.senderId,
            category: item.category || 'system',
            title: item.title || 'Notification',
            body: item.body || '',
            isRead: Boolean(item.isRead),
            createdAt: item.createdAt || new Date().toISOString(),
            readAt: item.readAt,
            metadata: item.metadata || {},
          })
        );

        const page = Number(rawPagination.page || 1);
        const totalPages = Number(rawPagination.totalPages || 1);

        return {
          message: response?.message,
          data,
          unreadCount,
          pagination: {
            limit: Number(rawPagination.limit || 15),
            page,
            total: Number(rawPagination.total || data.length),
            totalPages,
            hasMore: page < totalPages,
          },
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Notification' as const, id: _id })),
              { type: 'Notification' as const, id: 'LIST' },
            ]
          : [{ type: 'Notification' as const, id: 'LIST' }],
    }),

    getNotificationBadge: builder.query<NotificationBadgeResponse, void>({
      query: () => ({
        url: '/notifications/badge',
        method: 'GET',
      }),
      transformResponse: (response: any): NotificationBadgeResponse => ({
        message: response?.message,
        data: {
          unreadCount: response?.data?.unreadCount ?? 0,
          hasUnread: Boolean(response?.data?.hasUnread ?? (response?.data?.unreadCount > 0)),
        },
      }),
      providesTags: [{ type: 'Notification', id: 'BADGE' }],
    }),

    markNotificationAsRead: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'BADGE' },
      ],
    }),

    markAllNotificationsAsRead: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'BADGE' },
      ],
    }),

    registerDevice: builder.mutation<any, { token: string; platform: string; deviceId?: string; appVersion?: string }>({
      query: (body) => ({
        url: '/notifications/devices',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useGetNotificationBadgeQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useRegisterDeviceMutation,
} = notificationApi;
