import {
  describeTradeStatus,
  seasonSnapshot,
  tradeActionsFor,
  tradeBucket,
  tradeProposalProblem,
  waiverClaimProblem,
} from '../src/components/LeagueDetail/seasonRules';

/**
 * The Season Long Fantasy rules the league screens offer actions from.
 *
 * Each case mirrors a server check: getting one wrong shows a button the
 * server then refuses, or hides one a manager needs.
 */

const NOW = new Date('2026-10-14T12:00:00Z');
const LATER = '2026-10-16T12:00:00Z';
const EARLIER = '2026-10-13T12:00:00Z';

const trade = (overrides: Record<string, unknown> = {}) => ({
  status: 'proposed' as const,
  expiresAt: LATER,
  proposerFantasyTeamId: 'proposer',
  recipientFantasyTeamId: 'recipient',
  viewerHasVoted: false,
  ...overrides,
});

describe('seasonSnapshot', () => {
  const standings = [1, 2, 3, 4, 5].map((rank) => ({
    fantasyTeamId: `t${rank}`,
    rank,
    teamName: `Team ${rank}`,
    pointsFor: 100 - rank,
  }));

  it('projects the top four during the regular season', () => {
    const snap = seasonSnapshot({ leagueStatus: 'active', currentFantasyPeriod: 6, standings });
    expect(snap.phase).toBe('regular');
    expect(snap.finalistsAreLocked).toBe(false);
    expect(snap.finalists.map((f) => f.fantasyTeamId)).toEqual(['t1', 't2', 't3', 't4']);
  });

  it('locks the seeds the server sends once Match 10 is final', () => {
    const seeds = [
      { fantasyTeamId: 't5', rank: 2, regularSeasonTotal: 90 },
      { fantasyTeamId: 't1', rank: 1, regularSeasonTotal: 99 },
      { fantasyTeamId: 't2', rank: 3, regularSeasonTotal: 80 },
      { fantasyTeamId: 't3', rank: 4, regularSeasonTotal: 70 },
    ];
    const snap = seasonSnapshot({
      leagueStatus: 'active',
      currentFantasyPeriod: 11,
      standings,
      championshipSeeds: seeds,
    });
    expect(snap.phase).toBe('championship');
    // Seeds win over the live standings, in seed order.
    expect(snap.finalists.map((f) => f.fantasyTeamId)).toEqual(['t1', 't5', 't2', 't3']);
  });

  it('is complete once a champion is recorded', () => {
    expect(
      seasonSnapshot({ leagueStatus: 'active', championFantasyTeamId: 't1' }).phase,
    ).toBe('complete');
    expect(seasonSnapshot({ leagueStatus: 'completed' }).phase).toBe('complete');
  });

  it('never reports a Match past the championship', () => {
    expect(seasonSnapshot({ currentFantasyPeriod: 14 }).currentMatch).toBe(11);
    expect(seasonSnapshot({ currentFantasyPeriod: 0 }).currentMatch).toBe(1);
  });
});

describe('tradeActionsFor', () => {
  const viewer = (myFantasyTeamId: string | null, extra = {}) => ({
    myFantasyTeamId,
    isCommissioner: false,
    reviewType: 'commissioner_veto' as const,
    now: NOW,
    ...extra,
  });

  it('lets the recipient answer and the proposer withdraw an open offer', () => {
    expect(tradeActionsFor(trade(), viewer('recipient'))).toEqual(['accept', 'reject']);
    expect(tradeActionsFor(trade(), viewer('proposer'))).toEqual(['cancel']);
    expect(tradeActionsFor(trade(), viewer('someone-else'))).toEqual([]);
  });

  it('offers nothing on an expired offer', () => {
    expect(tradeActionsFor(trade({ expiresAt: EARLIER }), viewer('recipient'))).toEqual([]);
  });

  it('gives only the commissioner the review in a veto league', () => {
    const accepted = trade({ status: 'accepted' });
    expect(tradeActionsFor(accepted, viewer('x', { isCommissioner: true }))).toEqual([
      'approve',
      'veto',
    ]);
    expect(tradeActionsFor(accepted, viewer('x'))).toEqual([]);
  });

  it('lets every manager vote once in a voting league, parties included', () => {
    const accepted = trade({ status: 'accepted' });
    const voting = { reviewType: 'league_voting' as const };
    expect(tradeActionsFor(accepted, viewer('x', voting))).toEqual(['voteApprove', 'voteVeto']);
    expect(tradeActionsFor(accepted, viewer('proposer', voting))).toEqual([
      'voteApprove',
      'voteVeto',
    ]);
    expect(
      tradeActionsFor(trade({ status: 'accepted', viewerHasVoted: true }), viewer('x', voting)),
    ).toEqual([]);
    // A commissioner cannot short-circuit a vote.
    expect(
      tradeActionsFor(accepted, viewer(null, { ...voting, isCommissioner: true })),
    ).toEqual([]);
  });

  it('offers nothing on a settled trade', () => {
    for (const status of ['completed', 'rejected', 'vetoed', 'cancelled', 'expired']) {
      expect(
        tradeActionsFor(trade({ status }), viewer('recipient', { isCommissioner: true })),
      ).toEqual([]);
    }
  });
});

describe('tradeBucket', () => {
  it('puts offers waiting on me first and settled trades in history', () => {
    expect(tradeBucket(trade(), 'recipient')).toBe('action');
    expect(tradeBucket(trade(), 'proposer')).toBe('open');
    expect(tradeBucket(trade({ status: 'accepted' }), 'recipient')).toBe('open');
    expect(tradeBucket(trade({ status: 'completed' }), 'recipient')).toBe('history');
  });
});

describe('describeTradeStatus', () => {
  it('names the review stage after the league setting', () => {
    expect(describeTradeStatus('accepted', 'league_voting').label).toBe('League vote');
    expect(describeTradeStatus('accepted', 'commissioner_veto').label).toBe(
      'Commissioner review',
    );
  });
});

describe('tradeProposalProblem', () => {
  const base = { offered: 1, requested: 1, myRosterCount: 6, theirRosterCount: 6, rosterSize: 6 };

  it('accepts an even swap on full rosters', () => {
    expect(tradeProposalProblem(base)).toBeNull();
  });

  it('needs a team each way', () => {
    expect(tradeProposalProblem({ ...base, offered: 0 })).toMatch(/your teams/);
    expect(tradeProposalProblem({ ...base, requested: 0 })).toMatch(/ask for/);
  });

  it('refuses a trade that overfills either roster', () => {
    expect(tradeProposalProblem({ ...base, requested: 2 })).toMatch(/Your roster/);
    expect(tradeProposalProblem({ ...base, offered: 2 })).toMatch(/Their roster/);
  });
});

describe('waiverClaimProblem', () => {
  const base = {
    waiverType: 'faab' as const,
    bidAmount: 5,
    faabBalance: 10,
    rosterCount: 5,
    rosterSize: 6,
    hasDrop: false,
    hasDivision: true,
  };

  it('accepts an affordable claim with room on the roster', () => {
    expect(waiverClaimProblem(base)).toBeNull();
  });

  it('requires a drop on a full roster', () => {
    expect(waiverClaimProblem({ ...base, rosterCount: 6 })).toMatch(/Choose a team to drop/);
    expect(waiverClaimProblem({ ...base, rosterCount: 6, hasDrop: true })).toBeNull();
  });

  it('caps a FAAB bid at the balance and ignores bids on priority waivers', () => {
    expect(waiverClaimProblem({ ...base, bidAmount: 11 })).toMatch(/10 FAAB/);
    expect(
      waiverClaimProblem({ ...base, waiverType: 'waiver_priority', bidAmount: 999 }),
    ).toBeNull();
  });

  it('refuses everything when waivers are off', () => {
    expect(waiverClaimProblem({ ...base, waiverType: 'none' })).toMatch(/off/);
  });
});
