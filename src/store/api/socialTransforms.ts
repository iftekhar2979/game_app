/**
 * Pure data helpers for the community feature: response normalisation and the
 * client-side mirror of the server's reaction toggle rule.
 *
 * Kept free of any React Native or RTK Query import so it can be unit tested
 * directly.
 */

// ============================================================================
// Types
// ============================================================================

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
export type ReactionEntityType = 'post' | 'comment';

export const REACTION_TYPES: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

export type ReactionCounts = Record<ReactionType, number>;

export interface PostAuthor {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface CommunityPost {
  id: string;
  _id?: string;
  content: string;
  imageUrls: string[];
  author?: PostAuthor;
  authorId?: PostAuthor | string;
  reactionCounts: ReactionCounts;
  commentsCount: number;
  myReaction: ReactionType | null;
  isMine?: boolean;
  isFlagged?: boolean;
  flagReason?: string | null;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  _id?: string;
  postId: string;
  parentId: string | null;
  content: string;
  author?: PostAuthor;
  authorId?: PostAuthor | string;
  reactionCounts: ReactionCounts;
  repliesCount: number;
  myReaction: ReactionType | null;
  isFlagged?: boolean;
  createdAt: string;
  replies?: CommunityComment[];
}

export interface Pagination {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
  itemsPerPage: number;
  /** Feed only: the shuffle seed / pool anchor to echo back on the next page. */
  seed?: number;
}

export interface FeedResponse {
  posts: CommunityPost[];
  pagination: Pagination;
  /** Minted by the server; echo back on the next page to hold the ordering. */
  seed: number;
}

export interface ReactionResult {
  entityType: ReactionEntityType;
  entityId: string;
  action: 'added' | 'changed' | 'removed' | 'unchanged';
  myReaction: ReactionType | null;
  reactionCounts: ReactionCounts;
}

/** The API envelope produced by the backend ResponseInterceptor. */
export interface Envelope<T> {
  ok: boolean;
  status: number;
  message: string;
  data: T;
  pagination?: Pagination;
  seed?: number;
}

export const emptyCounts = (): ReactionCounts => ({
  like: 0,
  love: 0,
  haha: 0,
  wow: 0,
  sad: 0,
  angry: 0,
});

/** Normalises the id and author shapes the backend can emit. */
export function normalisePost(raw: any): CommunityPost {
  return {
    ...raw,
    id: raw.id || raw._id,
    imageUrls: raw.imageUrls || [],
    reactionCounts: { ...emptyCounts(), ...(raw.reactionCounts || {}) },
    commentsCount: raw.commentsCount ?? 0,
    myReaction: raw.myReaction ?? null,
    author: raw.author || (typeof raw.authorId === 'object' ? raw.authorId : undefined),
  };
}

export function normaliseComment(raw: any): CommunityComment {
  return {
    ...raw,
    id: raw.id || raw._id,
    reactionCounts: { ...emptyCounts(), ...(raw.reactionCounts || {}) },
    repliesCount: raw.repliesCount ?? 0,
    myReaction: raw.myReaction ?? null,
    author: raw.author || (typeof raw.authorId === 'object' ? raw.authorId : undefined),
    replies: (raw.replies || []).map(normaliseComment),
  };
}

export const totalReactions = (counts?: ReactionCounts): number =>
  counts ? Object.values(counts).reduce((sum, count) => sum + (count || 0), 0) : 0;

/** Local mirror of the server's toggle rule, for the optimistic update. */
export function applyOptimisticReaction(post: CommunityPost, type: ReactionType) {
  const previous = post.myReaction;
  if (previous) {
    post.reactionCounts[previous] = Math.max(0, (post.reactionCounts[previous] || 0) - 1);
  }
  if (previous === type) {
    post.myReaction = null;
  } else {
    post.reactionCounts[type] = (post.reactionCounts[type] || 0) + 1;
    post.myReaction = type;
  }
}

export function applyCommentReaction(
  comments: CommunityComment[],
  commentId: string,
  result: ReactionResult,
) {
  for (const comment of comments) {
    if (comment.id === commentId) {
      comment.reactionCounts = { ...emptyCounts(), ...result.reactionCounts };
      comment.myReaction = result.myReaction;
      return true;
    }
    if (comment.replies?.length && applyCommentReaction(comment.replies, commentId, result)) {
      return true;
    }
  }
  return false;
}
