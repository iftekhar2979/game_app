export type CurrentMatchupQueryArg =
  | string
  | { leagueId: string; week?: number };

export const buildCurrentMatchupRequest = (arg: CurrentMatchupQueryArg) => {
  const leagueId = typeof arg === 'string' ? arg : arg.leagueId;
  const week = typeof arg === 'object' ? arg.week : undefined;
  return {
    url: `leagues/${leagueId}/matchups/current`,
    params: week !== undefined ? { week } : undefined,
  };
};

export const currentMatchupCacheKey = (arg: CurrentMatchupQueryArg) => {
  const leagueId = typeof arg === 'string' ? arg : arg.leagueId;
  const week = typeof arg === 'object' ? arg.week : undefined;
  return `getCurrentMatchup-${leagueId}-week-${week ?? 'current'}`;
};
