import {
  calculateCheerFantasyPoints,
  getCheerPerformanceFantasyPreview,
} from '../src/utils/cheerScoring';

describe('fantasy cheer scoring', () => {
  it('matches the client example', () => {
    expect(calculateCheerFantasyPoints({
      officialScore: 98.1,
      otherTeamsInDivision: 4,
      placement: 2,
      hitZero: true,
    })).toEqual({
      scorePoints: 98.1,
      divisionResultPoints: 3,
      hitZeroPoints: 1,
      grandChampionPoints: 0,
      totalPoints: 10.21,
    });
  });

  it('awards one point for each beaten team at every placement', () => {
    expect(calculateCheerFantasyPoints({ officialScore: 90, otherTeamsInDivision: 4, placement: 1 }).divisionResultPoints).toBe(4);
    expect(calculateCheerFantasyPoints({ officialScore: 90, otherTeamsInDivision: 4, placement: 5 }).divisionResultPoints).toBe(0);
  });

  it('adds ten points for Grand Champion before division by ten', () => {
    expect(calculateCheerFantasyPoints({ officialScore: 98, grandChampion: true }).totalPoints).toBe(10.8);
  });

  it('previews published results and rejects missing or invalid scores', () => {
    expect(getCheerPerformanceFantasyPreview({ finalScore: '98.1', placement: 2, divisionEntryCount: 5, isHitZero: true })?.totalPoints).toBe(10.21);
    expect(getCheerPerformanceFantasyPreview({ finalScore: null })).toBeNull();
    expect(() => calculateCheerFantasyPoints({ officialScore: 101 })).toThrow();
  });
});
