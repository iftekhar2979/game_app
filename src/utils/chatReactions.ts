import type { LeagueChatReactionSummary } from '../store/api/leagueChatApi';

/** The quick reactions offered on a long-press, in display order. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;

/** The emoji this member currently holds on a message, if any. */
export function myReaction(
  reactions: LeagueChatReactionSummary[] | undefined | null,
  userId: string,
): string | null {
  if (!userId) return null;
  return reactions?.find((group) => group.userIds.includes(userId))?.emoji ?? null;
}

/**
 * The reactions after this member taps `emoji`, applied locally before the
 * server answers.
 *
 * Mirrors the server's rule exactly - one reaction per member, the same emoji
 * again removes it - so the optimistic state and the confirmed one agree and
 * nothing flickers when the response lands.
 */
export function toggleReactionLocally(
  reactions: LeagueChatReactionSummary[] | undefined | null,
  emoji: string,
  userId: string,
): LeagueChatReactionSummary[] {
  const current = reactions ?? [];
  const held = myReaction(current, userId);

  let next = current.map((group) => ({
    ...group,
    userIds: group.userIds.filter((id) => id !== userId),
  }));

  if (held !== emoji) {
    const existing = next.find((group) => group.emoji === emoji);
    if (existing) {
      existing.userIds = [...existing.userIds, userId];
    } else {
      next = [...next, { emoji, count: 0, userIds: [userId] }];
    }
  }

  return next
    .map((group) => ({ ...group, count: group.userIds.length }))
    .filter((group) => group.count > 0)
    .sort((a, b) => b.count - a.count);
}
