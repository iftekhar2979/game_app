import { shouldLeaveDraftRoomForPlay } from '../src/components/LeagueDetail/draftCompletion';

describe('leaving the draft room for play', () => {
  it('leaves when a running draft completes', () => {
    expect(
      shouldLeaveDraftRoomForPlay({
        status: 'completed',
        sawDraftRunning: true,
        alreadyLeft: false,
      }),
    ).toBe(true);
  });

  // Opening a room whose draft finished earlier should read as history rather
  // than bounce the viewer out the moment they arrive.
  it('stays put when the draft was already finished on arrival', () => {
    expect(
      shouldLeaveDraftRoomForPlay({
        status: 'completed',
        sawDraftRunning: false,
        alreadyLeft: false,
      }),
    ).toBe(false);
  });

  it('leaves only once', () => {
    expect(
      shouldLeaveDraftRoomForPlay({
        status: 'completed',
        sawDraftRunning: true,
        alreadyLeft: true,
      }),
    ).toBe(false);
  });

  it.each(['active', 'pending', 'cancelled', null, undefined])(
    'stays put while the draft is %s',
    status => {
      expect(
        shouldLeaveDraftRoomForPlay({
          status: status as string | null,
          sawDraftRunning: true,
          alreadyLeft: false,
        }),
      ).toBe(false);
    },
  );
});
