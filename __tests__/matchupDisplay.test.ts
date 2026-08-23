import {
  formatFantasyPoints,
  formatGameStatus,
  formatMatchupScore,
} from '../src/components/LeagueDetail/matchupDisplay';

describe('matchup display values', () => {
  it('renders positive, zero, and negative scores without truthy fallbacks', () => {
    expect(formatMatchupScore(12)).toBe('12');
    expect(formatMatchupScore(0)).toBe('0');
    expect(formatMatchupScore(-3)).toBe('-3');
    expect(formatFantasyPoints(12)).toBe('+12 pts');
    expect(formatFantasyPoints(0)).toBe('0 pts');
    expect(formatFantasyPoints(-3)).toBe('-3 pts');
  });

  it('does not invent zero points or an upcoming status for missing data', () => {
    expect(formatMatchupScore(undefined)).toBe('—');
    expect(formatFantasyPoints(undefined)).toBe('Not scored');
    expect(formatGameStatus(undefined)).toBe('Status unavailable');
  });
});
