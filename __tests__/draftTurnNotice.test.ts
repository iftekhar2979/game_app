import { describeMyTurnNotice } from '../src/components/LeagueDetail/draftTurnNotice';

const MY_TEAM = 'team-mine';
const OTHER_TEAM = 'team-other';

const activeDraft = (currentPick: number, onClock: string) => ({
  status: 'active' as const,
  isTurnOrdered: true,
  currentPick,
  currentTeam: { fantasyTeamId: onClock, name: 'Team', ownerId: null },
});

const pickBy = (fantasyTeamId: string) => ({
  fantasyTeamId,
  teamName: 'Rival Squad',
  cheerTeamName: 'Cheer Athletics Panthers',
});

describe('draft turn notice', () => {
  it('announces the turn after another manager picks', () => {
    const notice = describeMyTurnNotice({
      draft: activeDraft(4, MY_TEAM),
      pick: pickBy(OTHER_TEAM),
      myTeamId: MY_TEAM,
      lastNotifiedPick: null,
    });

    expect(notice).toEqual({
      pickNumber: 4,
      title: 'You are on the clock',
      message: 'Rival Squad took Cheer Athletics Panthers. Pick 4 is yours.',
    });
  });

  it('says nothing when someone else is on the clock', () => {
    expect(
      describeMyTurnNotice({
        draft: activeDraft(4, OTHER_TEAM),
        pick: pickBy(OTHER_TEAM),
        myTeamId: MY_TEAM,
        lastNotifiedPick: null,
      }),
    ).toBeNull();
  });

  // A replayed broadcast after a reconnect must not toast twice.
  it('announces a given pick only once', () => {
    expect(
      describeMyTurnNotice({
        draft: activeDraft(4, MY_TEAM),
        pick: pickBy(OTHER_TEAM),
        myTeamId: MY_TEAM,
        lastNotifiedPick: 4,
      }),
    ).toBeNull();
  });

  // Snake order turns back on itself, so the same manager can be up twice in a
  // row - the second turn is a different pick number and must still announce.
  it('announces again at a round boundary', () => {
    expect(
      describeMyTurnNotice({
        draft: activeDraft(5, MY_TEAM),
        pick: pickBy(OTHER_TEAM),
        myTeamId: MY_TEAM,
        lastNotifiedPick: 4,
      })?.pickNumber,
    ).toBe(5);
  });

  it('does not announce the pick this manager just made', () => {
    expect(
      describeMyTurnNotice({
        draft: activeDraft(5, MY_TEAM),
        pick: pickBy(MY_TEAM),
        myTeamId: MY_TEAM,
        lastNotifiedPick: null,
      }),
    ).toBeNull();
  });

  it('falls back to a bare message when the previous pick is unnamed', () => {
    expect(
      describeMyTurnNotice({
        draft: activeDraft(1, MY_TEAM),
        pick: null,
        myTeamId: MY_TEAM,
        lastNotifiedPick: null,
      })?.message,
    ).toBe('Pick 1 is yours.');
  });

  it('stays quiet for a completed draft', () => {
    expect(
      describeMyTurnNotice({
        draft: { ...activeDraft(8, MY_TEAM), status: 'completed' },
        pick: pickBy(OTHER_TEAM),
        myTeamId: MY_TEAM,
        lastNotifiedPick: null,
      }),
    ).toBeNull();
  });

  it('stays quiet for an auction, which has no pick order', () => {
    expect(
      describeMyTurnNotice({
        draft: { ...activeDraft(3, MY_TEAM), isTurnOrdered: false },
        pick: pickBy(OTHER_TEAM),
        myTeamId: MY_TEAM,
        lastNotifiedPick: null,
      }),
    ).toBeNull();
  });

  it('stays quiet before the viewer team is resolved', () => {
    expect(
      describeMyTurnNotice({
        draft: activeDraft(4, MY_TEAM),
        pick: pickBy(OTHER_TEAM),
        myTeamId: null,
        lastNotifiedPick: null,
      }),
    ).toBeNull();
  });
});
