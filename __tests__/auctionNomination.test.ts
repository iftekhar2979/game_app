import { resolveAuctionTurn } from '../src/components/LeagueDetail/auctionNomination';

const NOW = new Date('2026-09-07T12:00:00.000Z').getTime();
const auction = (overrides: any = {}) => ({
  status: 'active',
  currentTurnId: null,
  currentNominatorIndex: 0,
  nominationOrder: ['team-a', 'team-b'],
  nominationEndsAt: new Date(NOW + 30_000),
  ...overrides,
});
const view = ({ auction: overrides, ...rest }: any = {}) =>
  resolveAuctionTurn({
    isCommissioner: true,
    leagueStatus: 'auction_active',
    now: NOW,
    ...rest,
    auction: auction(overrides),
  });

describe('who is on the clock', () => {
  it('reads the nominator from the order', () => {
    expect(view().onClockTeamId).toBe('team-a');
    expect(view({ auction: { currentNominatorIndex: 1 } }).onClockTeamId).toBe('team-b');
  });

  it('recognises the viewer’s own turn', () => {
    expect(view({ myTeamId: 'team-a' }).isMyTurn).toBe(true);
    expect(view({ myTeamId: 'team-b' }).isMyTurn).toBe(false);
    expect(view({ myTeamId: null }).isMyTurn).toBe(false);
  });

  it('survives a malformed or empty order', () => {
    expect(view({ auction: { nominationOrder: [] } }).onClockTeamId).toBeNull();
    expect(view({ auction: { currentNominatorIndex: 9 } }).onClockTeamId).toBeNull();
    expect(view({ auction: { currentNominatorIndex: -1 } }).onClockTeamId).toBeNull();
    expect(resolveAuctionTurn({ auction: undefined, now: NOW }).onClockTeamId).toBeNull();
  });
});

describe('expiry is recoverable, not an error', () => {
  it('flags a passed deadline', () => {
    expect(view({ auction: { nominationEndsAt: new Date(NOW - 1) } }).isExpired).toBe(true);
  });

  it('does not flag an open window or a missing deadline', () => {
    expect(view().isExpired).toBe(false);
    expect(view({ auction: { nominationEndsAt: null } }).isExpired).toBe(false);
  });

  // An expired window is exactly when the commissioner most needs the button.
  it('still allows skipping once the window expired', () => {
    expect(view({ auction: { nominationEndsAt: new Date(NOW - 95_000) } }).canSkip).toBe(true);
  });
});

describe('skip mirrors the server guards', () => {
  it('is offered to a commissioner on a running auction', () => {
    const result = view();
    expect(result.canSkip).toBe(true);
    expect(result.skipBlockedReason).toBeNull();
  });

  it('is hidden from managers who are not the commissioner', () => {
    const result = view({ isCommissioner: false });
    expect(result.canSkip).toBe(false);
    expect(result.skipBlockedReason).toMatch(/commissioner/i);
  });

  it('is blocked while a nomination is open, so live bids are not discarded', () => {
    const result = view({ auction: { currentTurnId: 'turn-1' } });
    expect(result.canSkip).toBe(false);
    expect(result.skipBlockedReason).toMatch(/finalize/i);
  });

  it('is blocked when the auction is not running', () => {
    expect(view({ auction: { status: 'scheduled' } }).canSkip).toBe(false);
    expect(view({ auction: { status: 'completed' } }).canSkip).toBe(false);
  });

  it('is blocked when the league has left its auction phase', () => {
    expect(view({ leagueStatus: 'active' }).canSkip).toBe(false);
    expect(view({ leagueStatus: 'registration_closed' }).canSkip).toBe(false);
  });

  it('is blocked with no nomination order to advance', () => {
    expect(view({ auction: { nominationOrder: [] } }).canSkip).toBe(false);
  });

  it('does not block on an unknown league status', () => {
    expect(view({ leagueStatus: undefined }).canSkip).toBe(true);
  });
});
