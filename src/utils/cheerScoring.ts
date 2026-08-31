export const CHEER_DIVISIONS = [
  { id: 'x-small', code: 'XSMALL', name: 'X Small' },
  { id: 'small', code: 'SMALL', name: 'Small' },
  { id: 'medium-large', code: 'MEDIUM_LARGE', name: 'Medium/Large' },
  { id: 'x-small-coed', code: 'XSMALL_COED', name: 'X Small Coed' },
  { id: 'small-coed', code: 'SMALL_COED', name: 'Small Coed' },
  {
    id: 'medium-large-coed',
    code: 'MEDIUM_LARGE_COED',
    name: 'Medium Coed/Large Coed',
  },
  { id: 'non-tumbling', code: 'NON_TUMBLING', name: 'Non Tumbling' },
  {
    id: 'non-tumbling-coed',
    code: 'NON_TUMBLING_COED',
    name: 'Non Tumbling Coed',
  },
  { id: 'international', code: 'INTERNATIONAL', name: 'International' },
  {
    id: 'international-coed',
    code: 'INTERNATIONAL_COED',
    name: 'International Coed',
  },
] as const;

export const SCORE_BANDS = [
  { minimum: 98.5, maximum: 100, points: 50 },
  { minimum: 97, maximum: 98.5, points: 40 },
  { minimum: 95.5, maximum: 97, points: 30 },
  { minimum: 94, maximum: 95.5, points: 25 },
  { minimum: 92, maximum: 94, points: 20 },
  { minimum: 90, maximum: 92, points: 10 },
  { minimum: 87.5, maximum: 90, points: -10 },
  { minimum: 0, maximum: 87.5, points: -20 },
] as const;

export const DIVISION_WIN_BONUSES = [
  { minimumOtherTeams: 1, maximumOtherTeams: 2, points: 10 },
  { minimumOtherTeams: 3, maximumOtherTeams: 5, points: 20 },
  { minimumOtherTeams: 6, maximumOtherTeams: null, points: 30 },
] as const;

export const LAST_PLACE_PENALTIES = [
  { minimumOtherTeams: 2, maximumOtherTeams: 4, points: -15 },
  { minimumOtherTeams: 5, maximumOtherTeams: null, points: -25 },
] as const;

export const HIT_ZERO_BONUS = 10;
export const GRAND_CHAMPION_BONUS = 25;

export interface CheerScoringInput {
  officialScore: number;
  otherTeamsInDivision?: number;
  wonDivision?: boolean;
  finishedLast?: boolean;
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

const pointsForOtherTeamCount = (
  otherTeams: number,
  rules: ReadonlyArray<{
    minimumOtherTeams: number;
    maximumOtherTeams: number | null;
    points: number;
  }>,
) =>
  rules.find(
    rule =>
      otherTeams >= rule.minimumOtherTeams &&
      (rule.maximumOtherTeams === null || otherTeams <= rule.maximumOtherTeams),
  )?.points ?? 0;

export const getScoreBandPoints = (officialScore: number): number => {
  if (
    !Number.isFinite(officialScore) ||
    officialScore < 0 ||
    officialScore > 100
  ) {
    throw new Error('Official score must be between 0 and 100.');
  }

  // Bands are checked from highest to lowest. A shared boundary belongs to the
  // higher band: 98.5 earns 50, 97 earns 40, and so on.
  return (
    SCORE_BANDS.find(band => officialScore >= band.minimum)?.points ??
    SCORE_BANDS[SCORE_BANDS.length - 1].points
  );
};

export const calculateCheerFantasyPoints = ({
  officialScore,
  otherTeamsInDivision = 0,
  wonDivision = false,
  finishedLast = false,
  hitZero = false,
  grandChampion = false,
}: CheerScoringInput): CheerScoringBreakdown => {
  const normalizedOtherTeams = Math.max(0, Math.floor(otherTeamsInDivision));
  const scorePoints = getScoreBandPoints(officialScore);
  const divisionResultPoints = wonDivision
    ? pointsForOtherTeamCount(normalizedOtherTeams, DIVISION_WIN_BONUSES)
    : finishedLast
    ? pointsForOtherTeamCount(normalizedOtherTeams, LAST_PLACE_PENALTIES)
    : 0;
  const hitZeroPoints = hitZero ? HIT_ZERO_BONUS : 0;
  const grandChampionPoints = grandChampion ? GRAND_CHAMPION_BONUS : 0;

  return {
    scorePoints,
    divisionResultPoints,
    hitZeroPoints,
    grandChampionPoints,
    totalPoints:
      scorePoints + divisionResultPoints + hitZeroPoints + grandChampionPoints,
  };
};

export const getCheerPerformanceFantasyPreview = (
  performance: CheerPerformanceSummary,
): CheerScoringBreakdown | null => {
  const officialScore = Number(
    performance.finalScore ?? performance.officialScore,
  );
  if (!Number.isFinite(officialScore)) return null;

  const placement = Math.max(1, Math.floor(Number(performance.placement) || 1));
  const explicitOtherTeams = Number(performance.otherTeamsInDivision);
  const divisionEntryCount = Number(performance.divisionEntryCount);
  const otherTeamsInDivision = Number.isFinite(explicitOtherTeams)
    ? Math.max(0, Math.floor(explicitOtherTeams))
    : Number.isFinite(divisionEntryCount)
      ? Math.max(0, Math.floor(divisionEntryCount) - 1)
      : 0;

  try {
    return calculateCheerFantasyPoints({
      officialScore,
      otherTeamsInDivision,
      wonDivision: placement === 1,
      finishedLast:
        otherTeamsInDivision >= 2 && placement === otherTeamsInDivision + 1,
      hitZero: !!performance.isHitZero,
      grandChampion: !!performance.isGrandChampion,
    });
  } catch {
    return null;
  }
};
