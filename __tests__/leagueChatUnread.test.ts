import reducer, {
  clearUnread,
  incrementUnread,
  resetLeagueChatState,
  selectLeagueUnreadCount,
  setActiveChatLeague,
  setUnreadCount,
} from '../src/store/slices/leagueChatSlice';

const leagueId = 'league-1';
const otherLeagueId = 'league-2';

describe('league chat unread badge state', () => {
  it('starts every league at zero unread', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(0);
  });

  it('counts realtime messages arriving while the chat screen is closed', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, incrementUnread(leagueId));
    state = reducer(state, incrementUnread(leagueId));

    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(2);
    expect(selectLeagueUnreadCount(otherLeagueId)({ leagueChat: state })).toBe(
      0,
    );
  });

  it('does not accrue unreads for the league whose chat is open', () => {
    let state = reducer(undefined, setActiveChatLeague(leagueId));
    state = reducer(state, incrementUnread(leagueId));
    state = reducer(state, incrementUnread(otherLeagueId));

    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(0);
    expect(selectLeagueUnreadCount(otherLeagueId)({ leagueChat: state })).toBe(
      1,
    );
  });

  it('zeroes the badge when the chat screen opens', () => {
    let state = reducer(undefined, setUnreadCount({ leagueId, count: 7 }));
    state = reducer(state, setActiveChatLeague(leagueId));

    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(0);
  });

  it('resumes counting once the chat screen is left', () => {
    let state = reducer(undefined, setActiveChatLeague(leagueId));
    state = reducer(state, setActiveChatLeague(null));
    state = reducer(state, incrementUnread(leagueId));

    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(1);
  });

  it('adopts the authoritative server count and clamps negatives', () => {
    let state = reducer(undefined, setUnreadCount({ leagueId, count: 12 }));
    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(12);

    state = reducer(state, setUnreadCount({ leagueId, count: -3 }));
    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(0);
  });

  it('clears a single league without touching the others', () => {
    let state = reducer(undefined, setUnreadCount({ leagueId, count: 4 }));
    state = reducer(state, setUnreadCount({ leagueId: otherLeagueId, count: 2 }));
    state = reducer(state, clearUnread(leagueId));

    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(0);
    expect(selectLeagueUnreadCount(otherLeagueId)({ leagueChat: state })).toBe(
      2,
    );
  });

  it('drops all counts on logout', () => {
    let state = reducer(undefined, setUnreadCount({ leagueId, count: 9 }));
    state = reducer(state, setActiveChatLeague(otherLeagueId));
    state = reducer(state, resetLeagueChatState());

    expect(state.activeChatLeagueId).toBeNull();
    expect(selectLeagueUnreadCount(leagueId)({ leagueChat: state })).toBe(0);
  });
});
