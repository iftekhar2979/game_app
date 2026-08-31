import {
  calculateCheerFantasyPoints,
  CHEER_DIVISIONS,
  getCheerPerformanceFantasyPreview,
  getScoreBandPoints,
} from '../src/utils/cheerScoring';

describe('fantasy cheer scoring', () => {
  it('defines the ten supported cheer divisions', () => {
    expect(CHEER_DIVISIONS.map(division => division.name)).toEqual([
      'X Small',
      'Small',
      'Medium/Large',
      'X Small Coed',
      'Small Coed',
      'Medium Coed/Large Coed',
      'Non Tumbling',
      'Non Tumbling Coed',
      'International',
      'International Coed',
    ]);
  });

  it.each([
    [100, 50],
    [98.5, 50],
    [98.499, 40],
    [97, 40],
    [95.5, 30],
    [94, 25],
    [92, 20],
    [90, 10],
    [87.5, -10],
    [87.499, -20],
  ])('maps a score of %s to %s points', (score, points) => {
    expect(getScoreBandPoints(score)).toBe(points);
  });

  it('adds division-win, hit-zero, and grand-champion bonuses', () => {
    expect(
      calculateCheerFantasyPoints({
        officialScore: 99,
        otherTeamsInDivision: 6,
        wonDivision: true,
        hitZero: true,
        grandChampion: true,
      }),
    ).toEqual({
      scorePoints: 50,
      divisionResultPoints: 30,
      hitZeroPoints: 10,
      grandChampionPoints: 25,
      totalPoints: 115,
    });
  });

  it('applies the last-place penalties based on other teams in the division', () => {
    expect(
      calculateCheerFantasyPoints({
        officialScore: 91,
        otherTeamsInDivision: 4,
        finishedLast: true,
      }).totalPoints,
    ).toBe(-5);
    expect(
      calculateCheerFantasyPoints({
        officialScore: 89,
        otherTeamsInDivision: 5,
        finishedLast: true,
      }).totalPoints,
    ).toBe(-35);
  });

  it('rejects scores outside the official 0-100 range', () => {
    expect(() => getScoreBandPoints(100.1)).toThrow(
      'Official score must be between 0 and 100.',
    );
  });

  it('builds the same fantasy preview used by connected dashboards', () => {
    expect(
      getCheerPerformanceFantasyPreview({
        finalScore: '98.5',
        placement: 1,
        divisionEntryCount: 7,
        isHitZero: true,
        isGrandChampion: true,
      })?.totalPoints,
    ).toBe(115);
    expect(getCheerPerformanceFantasyPreview({ finalScore: null })).toBeNull();
  });
});
