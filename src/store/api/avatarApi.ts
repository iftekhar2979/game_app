import { baseApi } from './baseApi';
import { AvatarConfig } from '../../avatar/types';

/** One entry in the user's avatar wardrobe. */
export interface SavedAvatarEntry {
  id: string;
  _id?: string;
  /** Signed, short-lived URL for rendering. */
  avatarUrl: string | null;
  /** The raw S3 key, re-submittable without re-uploading. */
  avatarKey: string;
  avatarConfig: AvatarConfig | null;
  /**
   * How to draw this look, keyed by asset.
   *
   * Sent with the row because a saved avatar's parts can span several Base
   * Avatars - one built months ago, on a body since retired - so the wardrobe
   * cannot ask for "one character's wardrobe" the way the editor does. It needs
   * "how do I draw these particular keys", and the server already knows which
   * this row references.
   */
  artwork: Record<string, { imageUrl?: string | null; previewUrl?: string | null }>;
  isCurrent: boolean;
  createdAt: string;
}

export interface Pagination {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
  itemsPerPage: number;
}

interface Envelope<T> {
  ok: boolean;
  status: number;
  message: string;
  data: T;
  pagination?: Pagination;
}

const normalise = (raw: any): SavedAvatarEntry => ({
  ...raw,
  id: raw.id || raw._id,
  avatarConfig: raw.avatarConfig ?? null,
  artwork: raw.artwork ?? {},
  isCurrent: Boolean(raw.isCurrent),
});

export const avatarApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /** The wardrobe: every avatar this user has built, newest first. */
    getMyAvatars: builder.query<
      { avatars: SavedAvatarEntry[]; pagination: Pagination },
      { page?: number; limit?: number } | void
    >({
      query: (args) => ({
        url: '/users/me/avatars',
        method: 'GET',
        params: { page: args?.page ?? 1, limit: args?.limit ?? 30 },
      }),
      transformResponse: (response: Envelope<any[]>) => ({
        avatars: (response.data || []).map(normalise),
        pagination: response.pagination as Pagination,
      }),
      providesTags: ['Avatar'],
    }),

    /** Saves a freshly rendered avatar and makes it the current one. */
    saveAvatar: builder.mutation<
      SavedAvatarEntry,
      { avatarUrl: string; avatarConfig?: AvatarConfig | null }
    >({
      query: (body) => ({ url: '/users/me/avatars', method: 'POST', body }),
      transformResponse: (response: Envelope<any>) => normalise(response.data),
      // The profile avatar changes too, so the user cache is stale as well.
      invalidatesTags: ['Avatar', 'User'],
    }),

    /** Re-applies an earlier look from the wardrobe. */
    applyAvatar: builder.mutation<SavedAvatarEntry, string>({
      query: (id) => ({ url: `/users/me/avatars/${id}/apply`, method: 'PATCH' }),
      transformResponse: (response: Envelope<any>) => normalise(response.data),
      invalidatesTags: ['Avatar', 'User'],
    }),

    deleteAvatar: builder.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/users/me/avatars/${id}`, method: 'DELETE' }),
      transformResponse: (response: Envelope<{ id: string }>) => response.data,
      invalidatesTags: ['Avatar', 'User'],
    }),

    checkUsername: builder.query<{ available: boolean }, string>({
      query: (username) => ({
        url: '/users/me/username-available',
        method: 'GET',
        params: { username },
      }),
      transformResponse: (response: Envelope<{ available: boolean }>) => response.data,
    }),
  }),
});

export const {
  useGetMyAvatarsQuery,
  useSaveAvatarMutation,
  useApplyAvatarMutation,
  useDeleteAvatarMutation,
  useLazyCheckUsernameQuery,
} = avatarApi;
