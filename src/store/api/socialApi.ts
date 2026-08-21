import { baseApi } from './baseApi';
import {
  applyCommentReaction,
  applyOptimisticReaction,
  emptyCounts,
  normaliseComment,
  normalisePost,
} from './socialTransforms';
import type {
  CommunityComment,
  CommunityPost,
  Envelope,
  FeedResponse,
  Pagination,
  ReactionEntityType,
  ReactionResult,
  ReactionType,
} from './socialTransforms';

// Re-exported so screens keep a single import site for everything social.
export * from './socialTransforms';

// ============================================================================
// Endpoints
// ============================================================================

export const socialApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Shuffled community feed. `seed` is omitted on a fresh load/refresh and
     * echoed back while paging so the ordering stays stable.
     */
    getFeed: builder.query<FeedResponse, { page?: number; limit?: number; seed?: number; authorId?: string; mine?: boolean }>({
      query: ({ page = 1, limit = 10, seed, authorId, mine }) => ({
        url: '/social/posts',
        method: 'GET',
        params: {
          page,
          limit,
          ...(seed ? { seed } : {}),
          ...(authorId ? { authorId } : {}),
          ...(mine !== undefined ? { mine } : {}),
        },
      }),
      transformResponse: (response: Envelope<any[]>): FeedResponse => ({
        posts: (response.data || []).map(normalisePost),
        pagination: response.pagination as Pagination,
        // The server mints the shuffle seed and returns it inside `pagination`;
        // never derive it from the device clock, which can disagree with the
        // server's and would filter the whole feed away.
        seed: response.pagination?.seed as number,
      }),
      // Pages accumulate into one cache entry so the list can grow on scroll.
      // `limit`, `mine`, and `authorId` stay part of the key so independent consumers
      // (dashboard preview, full Community, user Profile, and AllPosts) do not collide.
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}-${queryArgs?.limit ?? 10}-${queryArgs?.mine ? 'mine' : ''}-${queryArgs?.authorId ?? ''}`,
      merge: (existing, incoming, { arg }) => {
        if (!arg.page || arg.page === 1) return incoming;
        const seen = new Set(existing.posts.map((post) => post.id));
        return {
          ...incoming,
          posts: [...existing.posts, ...incoming.posts.filter((post) => !seen.has(post.id))],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page || currentArg?.seed !== previousArg?.seed,
      providesTags: ['Social'],
    }),

    getPost: builder.query<CommunityPost, string>({
      query: (id) => ({ url: `/social/posts/${id}`, method: 'GET' }),
      transformResponse: (response: Envelope<any>) => normalisePost(response.data),
      providesTags: (_result, _error, id) => [{ type: 'Social' as const, id }],
    }),

    createPost: builder.mutation<CommunityPost, { content: string; imageUrls?: string[] }>({
      query: (body) => ({ url: '/social/posts', method: 'POST', body }),
      transformResponse: (response: Envelope<any>) => normalisePost(response.data),
      invalidatesTags: ['Social'],
    }),

    deletePost: builder.mutation<{ id: string }, string>({
      query: (id) => ({ url: `/social/posts/${id}`, method: 'DELETE' }),
      transformResponse: (response: Envelope<{ id: string }>) => response.data,
      invalidatesTags: ['Social'],
    }),

    getComments: builder.query<
      { comments: CommunityComment[]; pagination: Pagination },
      { postId: string; page?: number; limit?: number; replyLimit?: number }
    >({
      query: ({ postId, page = 1, limit = 20, replyLimit = 3 }) => ({
        url: `/social/posts/${postId}/comments`,
        method: 'GET',
        params: { page, limit, replyLimit },
      }),
      transformResponse: (response: Envelope<any[]>) => ({
        comments: (response.data || []).map(normaliseComment),
        pagination: response.pagination as Pagination,
      }),
      providesTags: (_result, _error, { postId }) => [{ type: 'Social' as const, id: `comments-${postId}` }],
    }),

    createComment: builder.mutation<
      CommunityComment,
      { postId: string; content: string; parentId?: string }
    >({
      query: ({ postId, ...body }) => ({
        url: `/social/posts/${postId}/comments`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: Envelope<any>) => normaliseComment(response.data),
      invalidatesTags: (_result, _error, { postId }) => [
        { type: 'Social' as const, id: `comments-${postId}` },
        { type: 'Social' as const, id: postId },
      ],
    }),

    deleteComment: builder.mutation<{ id: string }, { commentId: string; postId: string }>({
      query: ({ commentId }) => ({ url: `/social/comments/${commentId}`, method: 'DELETE' }),
      transformResponse: (response: Envelope<{ id: string }>) => response.data,
      invalidatesTags: (_result, _error, { postId }) => [
        { type: 'Social' as const, id: `comments-${postId}` },
        { type: 'Social' as const, id: postId },
      ],
    }),

    /**
     * Add / change / toggle off a reaction. Sending the type the user already
     * holds removes it, which is exactly what the reaction bar wants.
     *
     * The feed cache is patched optimistically so the tap feels instant, then
     * reconciled with the server's authoritative counters when they land.
     */
    react: builder.mutation<
      ReactionResult,
      { entityType: ReactionEntityType; entityId: string; type: ReactionType; postId?: string }
    >({
      query: ({ entityType, entityId, type }) => ({
        url: `/social/reactions/${entityType}/${entityId}`,
        method: 'POST',
        body: { type },
      }),
      transformResponse: (response: Envelope<ReactionResult>) => response.data,
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        if (arg.entityType === 'comment') {
          try {
            const { data } = await queryFulfilled;
            for (const cachedArg of socialApi.util.selectCachedArgsForQuery(
              getState(),
              'getComments',
            )) {
              if (cachedArg.postId !== arg.postId) continue;
              dispatch(
                socialApi.util.updateQueryData('getComments', cachedArg, (draft) => {
                  applyCommentReaction(draft.comments, arg.entityId, data);
                }),
              );
            }
          } catch {
            // The invalidated tag refetches the thread; nothing to roll back.
          }
          return;
        }

        // The feed can be cached under several arg sets at once (the dashboard
        // preview and the Community screen). Patch every one of them, so the
        // tap looks instant wherever the post happens to be on screen.
        const feedArgs = socialApi.util.selectCachedArgsForQuery(getState(), 'getFeed');
        const patches = feedArgs.map((cachedArg) =>
          dispatch(
            socialApi.util.updateQueryData('getFeed', cachedArg, (draft) => {
              const post = draft.posts.find((candidate) => candidate.id === arg.entityId);
              if (post) applyOptimisticReaction(post, arg.type);
            }),
          ),
        );

        try {
          const { data } = await queryFulfilled;
          // Reconcile with the server's authoritative counters.
          for (const cachedArg of feedArgs) {
            dispatch(
              socialApi.util.updateQueryData('getFeed', cachedArg, (draft) => {
                const post = draft.posts.find((candidate) => candidate.id === arg.entityId);
                if (post) {
                  post.reactionCounts = { ...emptyCounts(), ...data.reactionCounts };
                  post.myReaction = data.myReaction;
                }
              }),
            );
          }
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),

    removeReaction: builder.mutation<
      ReactionResult,
      { entityType: ReactionEntityType; entityId: string }
    >({
      query: ({ entityType, entityId }) => ({
        url: `/social/reactions/${entityType}/${entityId}`,
        method: 'DELETE',
      }),
      transformResponse: (response: Envelope<ReactionResult>) => response.data,
    }),
  }),
});

export const {
  useGetFeedQuery,
  useLazyGetFeedQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useDeletePostMutation,
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useReactMutation,
  useRemoveReactionMutation,
} = socialApi;
