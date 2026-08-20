import {
  applyCommentReaction,
  applyOptimisticReaction,
  emptyCounts,
  normaliseComment,
  normalisePost,
  totalReactions,
  type CommunityComment,
  type CommunityPost,
} from '../src/store/api/socialTransforms';

const post = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
  id: 'p1',
  content: 'hello',
  imageUrls: [],
  reactionCounts: emptyCounts(),
  commentsCount: 0,
  myReaction: null,
  createdAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

describe('normalisePost', () => {
  it('falls back to _id when the server sends a raw mongo document', () => {
    expect(normalisePost({ _id: 'abc', content: 'x' }).id).toBe('abc');
  });

  it('fills in every reaction type so counters are never undefined', () => {
    const result = normalisePost({ _id: 'a', reactionCounts: { like: 3 } });

    expect(result.reactionCounts).toEqual({ ...emptyCounts(), like: 3 });
  });

  it('lifts a populated authorId into author', () => {
    const result = normalisePost({ _id: 'a', authorId: { fullName: 'Dana' } });

    expect(result.author?.fullName).toBe('Dana');
  });

  it('leaves author undefined when authorId is just an id string', () => {
    expect(normalisePost({ _id: 'a', authorId: 'someid' }).author).toBeUndefined();
  });
});

describe('normaliseComment', () => {
  it('normalises nested replies recursively', () => {
    const result = normaliseComment({
      _id: 'c1',
      replies: [{ _id: 'r1', reactionCounts: { love: 2 } }],
    });

    expect(result.replies?.[0].id).toBe('r1');
    expect(result.replies?.[0].reactionCounts.love).toBe(2);
  });

  it('defaults replies to an empty array', () => {
    expect(normaliseComment({ _id: 'c1' }).replies).toEqual([]);
  });
});

describe('totalReactions', () => {
  it('sums every reaction type', () => {
    expect(totalReactions({ ...emptyCounts(), like: 2, love: 3, angry: 1 })).toBe(6);
  });

  it('handles a missing counter map', () => {
    expect(totalReactions(undefined)).toBe(0);
  });
});

describe('applyOptimisticReaction', () => {
  it('adds a reaction when the user holds none', () => {
    const subject = post();

    applyOptimisticReaction(subject, 'love');

    expect(subject.myReaction).toBe('love');
    expect(subject.reactionCounts.love).toBe(1);
  });

  it('swaps the counters when changing reaction type', () => {
    const subject = post({
      myReaction: 'like',
      reactionCounts: { ...emptyCounts(), like: 5, love: 1 },
    });

    applyOptimisticReaction(subject, 'love');

    expect(subject.myReaction).toBe('love');
    expect(subject.reactionCounts.like).toBe(4);
    expect(subject.reactionCounts.love).toBe(2);
  });

  it('toggles off when the held reaction is sent again', () => {
    const subject = post({
      myReaction: 'like',
      reactionCounts: { ...emptyCounts(), like: 1 },
    });

    applyOptimisticReaction(subject, 'like');

    expect(subject.myReaction).toBeNull();
    expect(subject.reactionCounts.like).toBe(0);
  });

  it('never drives a counter below zero', () => {
    const subject = post({ myReaction: 'like', reactionCounts: emptyCounts() });

    applyOptimisticReaction(subject, 'like');

    expect(subject.reactionCounts.like).toBe(0);
  });

  it('matches the server toggle rule over a full add/change/remove cycle', () => {
    const subject = post();

    applyOptimisticReaction(subject, 'like'); // add
    applyOptimisticReaction(subject, 'wow'); // change
    applyOptimisticReaction(subject, 'wow'); // remove

    expect(subject.myReaction).toBeNull();
    expect(totalReactions(subject.reactionCounts)).toBe(0);
  });
});

describe('applyCommentReaction', () => {
  const thread = (): CommunityComment[] => [
    {
      id: 'c1',
      postId: 'p1',
      parentId: null,
      content: 'top',
      reactionCounts: emptyCounts(),
      repliesCount: 1,
      myReaction: null,
      createdAt: '2026-08-20T00:00:00.000Z',
      replies: [
        {
          id: 'r1',
          postId: 'p1',
          parentId: 'c1',
          content: 'reply',
          reactionCounts: emptyCounts(),
          repliesCount: 0,
          myReaction: null,
          createdAt: '2026-08-20T00:00:00.000Z',
          replies: [],
        },
      ],
    },
  ];

  const result = {
    entityType: 'comment' as const,
    entityId: 'r1',
    action: 'added' as const,
    myReaction: 'haha' as const,
    reactionCounts: { ...emptyCounts(), haha: 1 },
  };

  it('finds and updates a nested reply', () => {
    const comments = thread();

    expect(applyCommentReaction(comments, 'r1', result)).toBe(true);
    expect(comments[0].replies?.[0].myReaction).toBe('haha');
    expect(comments[0].replies?.[0].reactionCounts.haha).toBe(1);
  });

  it('leaves the parent untouched when a reply is the target', () => {
    const comments = thread();

    applyCommentReaction(comments, 'r1', result);

    expect(comments[0].myReaction).toBeNull();
  });

  it('reports a miss when the comment is not in the thread', () => {
    expect(applyCommentReaction(thread(), 'nope', result)).toBe(false);
  });
});
