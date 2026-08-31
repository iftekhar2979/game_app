import {
  buildMatchupSettings,
  DEFAULT_MATCHUP_TIEBREAKER,
  MATCHUP_TIEBREAKER_OPTIONS,
} from '../src/constants/matchupSettings';

describe('create-league matchup settings', () => {
  it('offers only the tiebreaker values accepted by the league API', () => {
    expect(MATCHUP_TIEBREAKER_OPTIONS.map(option => option.value)).toEqual([
      'bench_points',
      'none',
    ]);
  });

  it('defaults safely and always builds the complete nested API contract', () => {
    expect(DEFAULT_MATCHUP_TIEBREAKER).toBe('none');
    expect(buildMatchupSettings(DEFAULT_MATCHUP_TIEBREAKER)).toEqual({
      format: 'head_to_head',
      tiebreaker: 'none',
    });
    expect(buildMatchupSettings('bench_points')).toEqual({
      format: 'head_to_head',
      tiebreaker: 'bench_points',
    });
  });
});
