import {
  buildCurrentMatchupRequest,
  currentMatchupCacheKey,
} from '../src/store/api/matchupQuery';

describe('matchup week queries', () => {
  it('sends the selected week using the backend week query parameter', () => {
    expect(
      buildCurrentMatchupRequest({ leagueId: 'league-1', week: 2 }),
    ).toEqual({
      url: 'leagues/league-1/matchups/current',
      params: { week: 2 },
    });
  });

  it('uses a distinct RTK Query cache entry for each week', () => {
    expect(currentMatchupCacheKey({ leagueId: 'league-1', week: 1 })).not.toBe(
      currentMatchupCacheKey({ leagueId: 'league-1', week: 2 }),
    );
  });

  it('keys the cache by both league and selected week', () => {
    expect(currentMatchupCacheKey({ leagueId: 'league-1', week: 2 })).not.toBe(
      currentMatchupCacheKey({ leagueId: 'league-2', week: 2 }),
    );
  });

  it('preserves the current-week request used outside the week picker', () => {
    expect(buildCurrentMatchupRequest('league-1')).toEqual({
      url: 'leagues/league-1/matchups/current',
      params: undefined,
    });
  });
});
