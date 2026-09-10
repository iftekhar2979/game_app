import { myReaction, toggleReactionLocally } from '../src/utils/chatReactions';

const ME = 'me';

describe('toggling a chat reaction locally', () => {
  it('adds my reaction', () => {
    expect(toggleReactionLocally([], '👍', ME)).toEqual([
      { emoji: '👍', count: 1, userIds: [ME] },
    ]);
  });

  it('removes it when I tap the same emoji again, and drops the empty group', () => {
    expect(
      toggleReactionLocally([{ emoji: '👍', count: 1, userIds: [ME] }], '👍', ME),
    ).toEqual([]);
  });

  it('moves me to a different emoji rather than giving me two', () => {
    // One reaction per member - the same rule the server applies.
    const next = toggleReactionLocally(
      [
        { emoji: '👍', count: 2, userIds: ['a', ME] },
        { emoji: '😂', count: 1, userIds: ['b'] },
      ],
      '😂',
      ME,
    );

    expect(next).toEqual([
      { emoji: '😂', count: 2, userIds: ['b', ME] },
      { emoji: '👍', count: 1, userIds: ['a'] },
    ]);
  });

  it('leaves other members alone', () => {
    const next = toggleReactionLocally([{ emoji: '❤️', count: 1, userIds: ['a'] }], '👍', ME);
    expect(next.find((group) => group.emoji === '❤️')?.userIds).toEqual(['a']);
  });
});

describe('which reaction is mine', () => {
  it('finds the emoji I hold', () => {
    expect(myReaction([{ emoji: '😮', count: 1, userIds: [ME] }], ME)).toBe('😮');
  });

  it('is nothing without a signed-in user', () => {
    expect(myReaction([{ emoji: '😮', count: 1, userIds: [''] }], '')).toBeNull();
  });
});
