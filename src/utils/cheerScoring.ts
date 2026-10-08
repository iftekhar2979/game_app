export const CHEER_DIVISIONS = [
  { id: 'x-small', code: 'X_SMALL', name: 'X Small' },
  { id: 'small', code: 'SMALL', name: 'Small' },
  { id: 'medium-large', code: 'MEDIUM_LARGE', name: 'Medium/Large' },
  { id: 'x-small-coed', code: 'X_SMALL_COED', name: 'X Small Coed' },
  { id: 'small-coed', code: 'SMALL_COED', name: 'Small Coed' },
  { id: 'medium-large-coed', code: 'MEDIUM_LARGE_COED', name: 'Medium Coed/Large Coed' },
  { id: 'non-tumbling', code: 'NON_TUMBLING', name: 'Non Tumbling' },
  { id: 'non-tumbling-coed', code: 'NON_TUMBLING_COED', name: 'Non Tumbling Coed' },
  { id: 'international', code: 'INTERNATIONAL', name: 'International' },
  { id: 'international-coed', code: 'INTERNATIONAL_COED', name: 'International Coed' },
] as const;

export const HIT_ZERO_BONUS = 1;
export const GRAND_CHAMPION_BONUS = 10;
export const FANTASY_SCORE_DIVISOR = 10;

export interface CheerScoringInput {
  officialScore: number;
  otherTeamsInDivision?: number;
  placement?: number;
  hitZero?: boolean;
  grandChampion?: boolean;
}

export interface CheerScoringBreakdown {
  scorePoints: number;
  divisionResultPoints: number;
  hitZeroPoints: number;
  grandChampionPoints: number;
  totalPoints: number;
}

export interface CheerPerformanceSummary {
  finalScore?: number | string | null;
  officialScore?: number | string | null;
  placement?: number | string | null;
  otherTeamsInDivision?: number | string | null;
  divisionEntryCount?: number | string | null;
  isHitZero?: boolean;
  isGrandChampion?: boolean;
}

export const calculateCheerFantasyPoints = ({
  officialScore,
  otherTeamsInDivision = 0,
  placement = 1,
  hitZero = false,
  grandChampion = false,
}: CheerScoringInput): CheerScoringBreakdown => {
  if (!Number.isFinite(officialScore) || officialScore < 0 || officialScore > 100) {
    throw new Error('Official score must be between 0 and 100.');
  }
  const otherTeams = Math.max(0, Math.floor(otherTeamsInDivision));
  const rank = Math.max(1, Math.floor(placement));
  const scorePoints = officialScore;
  const divisionResultPoints = Math.max(0, otherTeams - rank + 1);
  const hitZeroPoints = hitZero ? HIT_ZERO_BONUS : 0;
  const grandChampionPoints = grandChampion ? GRAND_CHAMPION_BONUS : 0;
  return {
    scorePoints,
    divisionResultPoints,
    hitZeroPoints,
    grandChampionPoints,
    totalPoints: Math.round(((scorePoints + divisionResultPoints + hitZeroPoints + grandChampionPoints) / FANTASY_SCORE_DIVISOR) * 1000) / 1000,
  };
};

export const getCheerPerformanceFantasyPreview = (
  performance: CheerPerformanceSummary,
): CheerScoringBreakdown | null => {
  const value = performance.finalScore ?? performance.officialScore;
  if (value === null || value === undefined || value === '') return null;
  const officialScore = Number(value);
  const explicitOtherTeams = performance.otherTeamsInDivision;
  const divisionEntryCount = performance.divisionEntryCount;
  const otherTeamsInDivision = explicitOtherTeams !== null && explicitOtherTeams !== undefined
    ? Number(explicitOtherTeams)
    : divisionEntryCount !== null && divisionEntryCount !== undefined
      ? Number(divisionEntryCount) - 1
      : 0;
  try {
    return calculateCheerFantasyPoints({
      officialScore,
      otherTeamsInDivision,
      placement: Number(performance.placement ?? 1),
      hitZero: !!performance.isHitZero,
      grandChampion: !!performance.isGrandChampion,
    });
  } catch {
    return null;
  }
};
