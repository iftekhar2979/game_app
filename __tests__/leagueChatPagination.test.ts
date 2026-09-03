import { mergeNewestFirst } from '../src/utils/leagueChatThread';
import type { LeagueChatMessage } from '../src/store/api/leagueChatApi';

const message = (
  id: string,
  createdAt: string,
  text = id,
): LeagueChatMessage => ({
  id,
  leagueId: 'league-1',
  text,
  clientMessageId: null,
  createdAt,
  sender: {
    id: 'user-1',
    fullName: 'Alex Manager',
    username: 'alex',
    avatarUrl: null,
  },
});

// A server page: newest first, exactly how `sort({ _id: -1 })` returns it.
const pageOne = [
  message('64b000000000000000000030', '2026-08-26T10:30:00.000Z'),
  message('64b000000000000000000029', '2026-08-26T10:29:00.000Z'),
  message('64b000000000000000000028', '2026-08-26T10:28:00.000Z'),
];
const pageTwo = [
  message('64b000000000000000000027', '2026-08-26T10:27:00.000Z'),
  message('64b000000000000000000026', '2026-08-26T10:26:00.000Z'),
];

const ids = (rows: LeagueChatMessage[]) => rows.map(row => row.id);

describe('league chat pagination merge', () => {
  it('keeps the thread newest-first across appended pages', () => {
    const merged = mergeNewestFirst(pageOne, pageTwo);

    expect(ids(merged)).toEqual([
      '64b000000000000000000030',
      '64b000000000000000000029',
      '64b000000000000000000028',
      '64b000000000000000000027',
      '64b000000000000000000026',
    ]);
  });

  it('accumulates older pages instead of replacing the thread', () => {
    let thread = mergeNewestFirst([], pageOne);
    thread = mergeNewestFirst(thread, pageTwo);

    expect(thread).toHaveLength(5);
  });

  it('drops duplicates when a page overlaps what is already loaded', () => {
    const thread = mergeNewestFirst(pageOne, [pageOne[2], ...pageTwo]);

    expect(thread).toHaveLength(5);
    expect(ids(thread).filter(id => id === '64b000000000000000000028')).toEqual([
      '64b000000000000000000028',
    ]);
  });

  it('lets a re-fetched message replace its stale copy', () => {
    const edited = message(
      '64b000000000000000000029',
      '2026-08-26T10:29:00.000Z',
      'edited body',
    );
    const thread = mergeNewestFirst(pageOne, [edited]);

    expect(thread).toHaveLength(3);
    expect(thread[1].text).toBe('edited body');
  });

  it('places a realtime arrival at the head of the thread', () => {
    const live = message('64b000000000000000000031', '2026-08-26T10:31:00.000Z');
    const thread = mergeNewestFirst(pageOne, [live]);

    expect(thread[0].id).toBe('64b000000000000000000031');
  });

  it('orders messages sharing a timestamp by id, matching the server sort', () => {
    const sameMs = '2026-08-26T10:40:00.000Z';
    const a = message('64b000000000000000000041', sameMs);
    const b = message('64b000000000000000000042', sameMs);
    const c = message('64b000000000000000000043', sameMs);

    // Whatever order they arrive in, the rendered order must be stable.
    expect(ids(mergeNewestFirst([a, b, c], []))).toEqual(ids(mergeNewestFirst([c, a, b], [])));
    expect(ids(mergeNewestFirst([b, c, a], []))).toEqual([
      '64b000000000000000000043',
      '64b000000000000000000042',
      '64b000000000000000000041',
    ]);
  });

  it('keeps the newest message stable while older pages are appended', () => {
    let thread = mergeNewestFirst([], pageOne);
    const newestBefore = thread[0].id;

    thread = mergeNewestFirst(thread, pageTwo);

    // The read cursor is driven off messages[0]; paging back must not move it.
    expect(thread[0].id).toBe(newestBefore);
  });
});
