import type { MatchupTiebreaker } from '../store/api/leagueApi';

export const DEFAULT_MATCHUP_TIEBREAKER: MatchupTiebreaker = 'none';

export const MATCHUP_TIEBREAKER_OPTIONS: ReadonlyArray<{
  value: MatchupTiebreaker;
  label: string;
  description: string;
}> = [
  {
    value: 'bench_points',
    label: 'Bench Points',
    description: 'Use bench points to resolve an equal matchup score.',
  },
  {
    value: 'none',
    label: 'None',
    description: 'Leave an equal matchup score as a tie.',
  },
];

export function buildMatchupSettings(tiebreaker: MatchupTiebreaker) {
  return {
    format: 'head_to_head' as const,
    tiebreaker,
  };
}
