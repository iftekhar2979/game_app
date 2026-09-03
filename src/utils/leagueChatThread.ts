import type { LeagueChatMessage } from '../store/api/leagueChatApi';
import { mergeNewestFirst as mergeGeneric } from './mergeNewestFirst';

/**
 * Merges a page (or a realtime arrival) into the chat thread, newest first.
 *
 * See `mergeNewestFirst` for why the order is what it is - it has to match the
 * server's `_id` sort, which is what the `before` cursor partitions on.
 */
export const mergeNewestFirst = (
  current: LeagueChatMessage[],
  incoming: LeagueChatMessage[],
): LeagueChatMessage[] => mergeGeneric(current, incoming);
