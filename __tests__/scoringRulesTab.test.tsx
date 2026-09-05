import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('lucide-react-native', () => {
  const MockReact = require('react');
  const { View: MockView } = require('react-native');
  const Icon = () => MockReact.createElement(MockView);
  return new Proxy({}, { get: () => Icon });
});

jest.mock('../src/store/api/leagueApi', () => ({
  useGetCurrentMatchupQuery: jest.fn(),
  useGetLeagueStandingsQuery: jest.fn(),
  useGetMatchupHistoryQuery: jest.fn(),
}));

jest.mock('../src/components/LeagueDetail/RosterPlayerRow', () => ({
  RosterSections: () => null,
}));

import { ScoringRulesTab } from '../src/components/LeagueDetail/LeagueDetailTabs';
import {
  DIVISION_WIN_BONUSES,
  GRAND_CHAMPION_BONUS,
  HIT_ZERO_BONUS,
  LAST_PLACE_PENALTIES,
  SCORE_BANDS,
} from '../src/utils/cheerScoring';

/**
 * The agreed rule set, transcribed from the product spec rather than from the
 * source. If these two ever disagree, the constants moved and scoring changed
 * for every league at once - which is exactly what this file exists to catch.
 */
const AGREED_SCORE_BANDS = [
  { minimum: 98.5, maximum: 100, points: 50 },
  { minimum: 97, maximum: 98.5, points: 40 },
  { minimum: 95.5, maximum: 97, points: 30 },
  { minimum: 94, maximum: 95.5, points: 25 },
  { minimum: 92, maximum: 94, points: 20 },
  { minimum: 90, maximum: 92, points: 10 },
  { minimum: 87.5, maximum: 90, points: -10 },
  { minimum: 0, maximum: 87.5, points: -20 },
];

const AGREED_DIVISION_WINS = [
  { minimumOtherTeams: 1, maximumOtherTeams: 2, points: 10 },
  { minimumOtherTeams: 3, maximumOtherTeams: 5, points: 20 },
  { minimumOtherTeams: 6, maximumOtherTeams: null, points: 30 },
];

const AGREED_LAST_PLACE = [
  { minimumOtherTeams: 2, maximumOtherTeams: 4, points: -15 },
  { minimumOtherTeams: 5, maximumOtherTeams: null, points: -25 },
];

describe('the fixed scoring rule set', () => {
  it('matches the agreed official-score bands exactly', () => {
    expect(SCORE_BANDS.map(band => ({ ...band }))).toEqual(AGREED_SCORE_BANDS);
  });

  it('matches the agreed division-win bonuses', () => {
    expect(DIVISION_WIN_BONUSES.map(bonus => ({ ...bonus }))).toEqual(
      AGREED_DIVISION_WINS,
    );
  });

  it('matches the agreed last-place penalties', () => {
    expect(LAST_PLACE_PENALTIES.map(penalty => ({ ...penalty }))).toEqual(
      AGREED_LAST_PLACE,
    );
  });

  it('matches the agreed flat bonuses', () => {
    expect(HIT_ZERO_BONUS).toBe(10);
    expect(GRAND_CHAMPION_BONUS).toBe(25);
  });

  it('leaves no gap between the bands', () => {
    for (let i = 0; i < SCORE_BANDS.length - 1; i += 1) {
      expect(SCORE_BANDS[i].minimum).toBe(SCORE_BANDS[i + 1].maximum);
    }
    expect(SCORE_BANDS[0].maximum).toBe(100);
    expect(SCORE_BANDS[SCORE_BANDS.length - 1].minimum).toBe(0);
  });

  it('keeps the bands ordered high to low, which getScoreBandPoints relies on', () => {
    const minimums = SCORE_BANDS.map(band => band.minimum);
    expect([...minimums].sort((a, b) => b - a)).toEqual(minimums);
  });
});

describe('ScoringRulesTab', () => {
  const render = () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ScoringRulesTab />);
    });
    return JSON.stringify(renderer.toJSON());
  };

  it('lists every scoring band, bonus and penalty', () => {
    const tree = render();

    expect(tree).toContain('Scored 98.5-100');
    expect(tree).toContain('Scored 90-92');
    expect(tree).toContain('Scored 87.5-90');
    expect(tree).toContain('Scored below 87.5');
    expect(tree).toContain('Winning division with 1-2 other teams');
    expect(tree).toContain('Winning division with 3-5 other teams');
    expect(tree).toContain('Winning division with 6 or more other teams');
    expect(tree).toContain('Hit zero deductions');
    expect(tree).toContain('Grand champion');
    expect(tree).toContain('Finishing last in a division with 2-4 other teams');
    expect(tree).toContain(
      'Finishing last in a division with 5 or more other teams',
    );
  });

  it('signs every value so bonuses and deductions cannot be confused', () => {
    const tree = render();

    expect(tree).toContain('+50 pts');
    expect(tree).toContain('+25 pts');
    expect(tree).toContain('-10 pts');
    expect(tree).toContain('-20 pts');
    expect(tree).toContain('-15 pts');
    expect(tree).toContain('-25 pts');
  });

  it('renders one row per rule and nothing invented', () => {
    const tree = render();
    const rowCount = (tree.match(/ pts"/g) || []).length;

    expect(rowCount).toBe(
      SCORE_BANDS.length +
        DIVISION_WIN_BONUSES.length +
        LAST_PLACE_PENALTIES.length +
        2, // hit zero and grand champion
    );
  });
});
