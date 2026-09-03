/** Anything the app paginates newest-first: a chat message, a ledger row. */
export interface NewestFirstItem {
  id: string;
  createdAt: string;
}

/**
 * Merges a page (or a realtime arrival) into a newest-first list.
 *
 * Two rules make this safe to call with anything, in any order:
 *
 * - Keyed by `id`, so an overlapping page or a re-delivered item replaces its
 *   copy instead of duplicating it.
 * - Ties on `createdAt` are broken by `id` descending, which matches the
 *   server's `sort({ _id: -1 })` - the order every `before` cursor partitions
 *   on. Without the tiebreak, items sharing a millisecond can swap places
 *   between renders and make a list jump under the reader.
 */
export const mergeNewestFirst = <T extends NewestFirstItem>(
  current: T[],
  incoming: T[],
): T[] => {
  const byId = new Map<string, T>();
  [...current, ...incoming].forEach(item => byId.set(item.id, item));
  return Array.from(byId.values()).sort((a, b) => {
    const byTime =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
  });
};
