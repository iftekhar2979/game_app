import React, { useState } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { MatchTab } from '../src/components/LeagueDetail/LeagueDetailTabs';
import type {
  LeagueMatchScoresResponse,
  SeasonMatch,
} from '../src/store/api/leagueApi';

const mockRefetchScores = jest.fn();
const mockRetryMatches = jest.fn();
const mockUseGetLeagueMatchScoresQuery = jest.fn();

jest.mock('../src/store/api/leagueApi', () => ({
  useGetLeagueMatchScoresQuery: (...args: unknown[]) =>
    mockUseGetLeagueMatchScoresQuery(...args),
  useGetLeagueStandingsQuery: jest.fn(),
}));

jest.mock('../src/components/LeagueDetail/RosterPlayerRow', () => ({
  RosterSections: () => null,
}));

jest.mock('lucide-react-native', () => {
  const MockReact = require('react');
  const { View: MockView } = require('react-native');
  const Icon = () => MockReact.createElement(MockView);
  return new Proxy({}, { get: () => Icon });
});

const matches: SeasonMatch[] = [3, 4].map(number => ({
  _id: `match-${number}`,
  seasonId: 'season-1',
  number,
  phase: 'regular',
  dateWindows: [],
}));

const scores: LeagueMatchScoresResponse = {
  leagueId: 'league-1',
  seasonId: 'season-1',
  matchNumber: 3,
  isCurrentMatch: true,
  // Deliberately out of rank order: the client must preserve API order.
  entries: [
    { fantasyTeamId: 'team-b', displayName: 'karim', points: 42.5, rank: 2, isCurrentUser: true },
    { fantasyTeamId: 'team-a', displayName: 'hasan', points: 45.2, rank: 1, isCurrentUser: false },
    { fantasyTeamId: 'team-c', displayName: 'mina', points: 42.5, rank: 2, isCurrentUser: false },
    { fantasyTeamId: 'team-d', displayName: 'omar', points: 0, rank: 4, isCurrentUser: false },
    { fantasyTeamId: 'team-e', displayName: 'lina', points: 0, rank: 4, isCurrentUser: false },
    { fantasyTeamId: 'team-f', displayName: 'sara', points: 0, rank: 4, isCurrentUser: false },
  ],
  me: { fantasyTeamId: 'team-b', points: 42.5, rank: 2 },
};

const queryResult = (data: LeagueMatchScoresResponse | undefined = scores) => ({
  currentData: data,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: mockRefetchScores,
});

const text = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(renderer.toJSON());

async function renderMatch(props: Partial<React.ComponentProps<typeof MatchTab>> = {}) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <MatchTab
        leagueId="league-1"
        matches={matches}
        matchesLoading={false}
        matchesError={false}
        selectedMatchNumber={3}
        onSelectMatch={jest.fn()}
        onRetryMatches={mockRetryMatches}
        {...props}
      />,
    );
  });
  return renderer;
}

describe('Total Points Match tab', () => {
  beforeEach(() => {
    mockUseGetLeagueMatchScoresQuery.mockReset();
    mockUseGetLeagueMatchScoresQuery.mockReturnValue(queryResult());
    mockRefetchScores.mockClear();
    mockRetryMatches.mockClear();
  });

  it('keeps API order and ranks, formats two decimals, and highlights You', async () => {
    const renderer = await renderMatch();
    const renderedRows = renderer.root.findAll(node =>
      String(node.props.testID || '').startsWith('league-match-row-'),
    );
    const rows = renderedRows.filter((row, index) =>
      renderedRows.findIndex(other => other.props.testID === row.props.testID) === index,
    );
    expect(rows.map(row => row.props.testID)).toEqual([
      'league-match-row-team-b',
      'league-match-row-team-a',
      'league-match-row-team-c',
      'league-match-row-team-d',
      'league-match-row-team-e',
      'league-match-row-team-f',
    ]);
    expect(rows[0].props.accessibilityState.selected).toBe(true);
    expect(rows[0].props.className).toContain('border-[#8B3DFF]');
    expect(rows[1].props.accessibilityState.selected).toBe(false);
    const output = text(renderer);
    expect(output).toContain('You');
    expect(output).toContain('45.20');
    expect(output).toContain('42.50');
    expect(output).toContain('0.00');
    const rankValue = renderer.root.findAllByType(require('react-native').Text)
      .find(node => Array.isArray(node.props.children) && node.props.children.join('') === '#2 of 6');
    expect(rankValue).toBeDefined();
    expect(output).toContain('Current');
    expect(rows[0].findAllByType(require('react-native').Text)[0].props.children).toBe(2);
    expect(rows[2].findAllByType(require('react-native').Text)[0].props.children).toBe(2);
    expect(output.toLowerCase()).not.toContain('bye');
  });

  it('hides the personal summary when me is null', async () => {
    mockUseGetLeagueMatchScoresQuery.mockReturnValue(
      queryResult({ ...scores, me: null, entries: scores.entries.map(entry => ({
        ...entry, isCurrentUser: false,
      })) }),
    );
    const output = text(await renderMatch());
    expect(output).not.toContain('My Score');
    expect(output).not.toContain('My Rank');
    expect(output).toContain('League Match Scores');
  });

  it('shows the zero-score note alongside all rows, and a distinct empty state', async () => {
    const zeroEntries = scores.entries.map(entry => ({ ...entry, points: 0, rank: 1 }));
    mockUseGetLeagueMatchScoresQuery.mockReturnValue(
      queryResult({ ...scores, entries: zeroEntries, me: { ...scores.me!, points: 0, rank: 1 } }),
    );
    const zero = text(await renderMatch());
    expect(zero).toContain('Scores will appear once competition results are published.');
    expect(zero).toContain('0.00');
    expect(zero).toContain('hasan');

    mockUseGetLeagueMatchScoresQuery.mockReturnValue(
      queryResult({ ...scores, entries: [], me: null }),
    );
    const empty = text(await renderMatch());
    expect(empty).toContain('No league Match scores are available yet.');
    expect(empty).not.toContain('Scores will appear once competition results are published.');
  });

  it('queries the newly selected Match number', async () => {
    const Harness = () => {
      const [selected, setSelected] = useState(3);
      return (
        <MatchTab
          leagueId="league-1"
          matches={matches}
          matchesLoading={false}
          matchesError={false}
          selectedMatchNumber={selected}
          onSelectMatch={setSelected}
          onRetryMatches={mockRetryMatches}
        />
      );
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<Harness />);
    });
    await ReactTestRenderer.act(() => {
      renderer.root.findByProps({ accessibilityLabel: 'Match 4' }).props.onPress();
    });
    expect(mockUseGetLeagueMatchScoresQuery).toHaveBeenLastCalledWith(
      { leagueId: 'league-1', matchNumber: 4 },
      expect.any(Object),
    );
  });

  it('shows a loading skeleton and an error with a working retry', async () => {
    mockUseGetLeagueMatchScoresQuery.mockReturnValue({
      ...queryResult(), currentData: undefined, isLoading: true,
    });
    expect(text(await renderMatch())).toContain('Loading Match scores');

    mockUseGetLeagueMatchScoresQuery.mockReturnValue({
      ...queryResult(), currentData: undefined, isError: true,
    });
    const error = await renderMatch();
    expect(text(error)).toContain('Unable to load Match scores');
    await ReactTestRenderer.act(() => {
      error.root.findByProps({ accessibilityLabel: 'Retry loading Match scores' }).props.onPress();
    });
    expect(mockRefetchScores).toHaveBeenCalledTimes(1);
    expect(text(error).toLowerCase()).not.toContain('bye');
  });
});
