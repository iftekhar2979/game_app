import type { ReactionType } from '../store/api/socialTransforms';

/**
 * Which haptic and which sound a reaction gets.
 *
 * Kept pure so the mapping is testable without a device - the effects live in
 * `feedback.ts`.
 */

export type SoundName =
  | 'reaction_like'
  | 'reaction_love'
  | 'reaction_haha'
  | 'reaction_wow'
  | 'reaction_cry'
  | 'reaction_angry'
  | 'chat_send'
  | 'chat_react';

export type HapticName = 'selection' | 'impactLight' | 'soft';

/** One sound per reaction, so each reads differently without looking. */
export const REACTION_SOUND: Record<ReactionType, SoundName> = {
  like: 'reaction_like',
  love: 'reaction_love',
  haha: 'reaction_haha',
  wow: 'reaction_wow',
  sad: 'reaction_cry',
  angry: 'reaction_angry',
};

export interface Feedback {
  haptic: HapticName;
  sound: SoundName | null;
}

/**
 * Feedback for tapping a reaction.
 *
 * Tapping the reaction you already hold removes it. That gets a softer haptic
 * and no sound: a sound on removal would say "reacted" at the moment the
 * reaction disappeared.
 */
export function reactionFeedback(
  current: ReactionType | null,
  tapped: ReactionType,
): Feedback {
  if (current === tapped) return { haptic: 'soft', sound: null };
  return { haptic: 'impactLight', sound: REACTION_SOUND[tapped] };
}
