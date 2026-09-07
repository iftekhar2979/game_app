import {
  isAuctionLeague,
  isAuctionDraftPhaseStatus,
  isPlayModeStatus,
} from '../src/components/LeagueDetail/auctionLifecycle';

const auction = { draftSettings: { type: 'auction' } };
const snake = { draftSettings: { type: 'snake' } };

describe('auction league detection', () => {
  it('identifies an auction league', () => {
    expect(isAuctionLeague(auction)).toBe(true);
  });

  it('does not claim snake, linear or unknown leagues are auctions', () => {
    expect(isAuctionLeague(snake)).toBe(false);
    expect(isAuctionLeague({ draftSettings: { type: 'linear' } })).toBe(false);
    expect(isAuctionLeague({})).toBe(false);
    expect(isAuctionLeague(undefined)).toBe(false);
  });
});

describe('play mode comes only from the server', () => {
  it('accepts the display label and the server value', () => {
    expect(isPlayModeStatus('Play')).toBe(true);
    expect(isPlayModeStatus('active')).toBe(true);
  });

  // The reported bug: the commissioner moved draftStartsAt closer, it elapsed,
  // and the screen declared Play with no nomination having happened. No status
  // is derived from the countdown any more, for any draft type - a draft start
  // time is not a draft completion.
  it('rejects every status that is not league play', () => {
    [
      'auction_active',
      'auction_scheduled',
      'draft',
      'drafting',
      'Draft',
      'registration_open',
      'registration_closed',
      'completed',
      'cancelled',
      undefined,
      null,
    ].forEach(status => expect(isPlayModeStatus(status)).toBe(false));
  });
});

describe('server-authoritative status mapping', () => {
  // Test 4: after a reload the screen reads the server status. auction_active
  // must land on the draft experience, not matchups.
  it('classifies an auction in progress as a draft phase', () => {
    expect(isAuctionDraftPhaseStatus('auction_active')).toBe(true);
    expect(isAuctionDraftPhaseStatus('auction_scheduled')).toBe(true);
  });

  // Test 5: only genuine completion reaches play.
  it('never classifies active as a draft phase', () => {
    expect(isAuctionDraftPhaseStatus('active')).toBe(false);
  });

  // Snake statuses must keep flowing through the branches they always used.
  it('claims no snake status', () => {
    ['draft', 'drafting', 'registration_open', 'registration_closed',
     'completed', 'cancelled', undefined].forEach(status =>
      expect(isAuctionDraftPhaseStatus(status)).toBe(false),
    );
  });
});
