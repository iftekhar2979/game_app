import { REACTION_TYPES } from '../src/store/api/socialTransforms';
import { REACTION_SOUND, reactionFeedback } from '../src/feedback/reactionFeedback';

describe('reaction sounds', () => {
  it('gives each of the six reactions its own sound', () => {
    const sounds = REACTION_TYPES.map((type) => REACTION_SOUND[type]);
    expect(new Set(sounds).size).toBe(6);
  });

  it('plays the cry sound for the sad reaction', () => {
    expect(REACTION_SOUND.sad).toBe('reaction_cry');
  });
});

describe('feedback for a tap', () => {
  it('adding a reaction is a light tap with that reaction\'s sound', () => {
    expect(reactionFeedback(null, 'haha')).toEqual({
      haptic: 'impactLight',
      sound: 'reaction_haha',
    });
  });

  it('switching reactions plays the new one', () => {
    expect(reactionFeedback('like', 'angry').sound).toBe('reaction_angry');
  });

  it('removing a reaction is a softer tap and no sound', () => {
    // A sound here would say "reacted" at the moment the reaction disappears.
    expect(reactionFeedback('love', 'love')).toEqual({ haptic: 'soft', sound: null });
  });
});
