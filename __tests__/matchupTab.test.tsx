import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { MatchupTab } from '../src/components/LeagueDetail/LeagueDetailTabs';

const mockRefetch = jest.fn();
const mockUseGetCurrentMatchupQuery = jest.fn();

jest.mock('../src/store/api/leagueApi', () => ({
  useGetCurrentMatchupQuery: (...args: unknown[]) =>
    mockUseGetCurrentMatchupQuery(...args),
  useGetLeagueStandingsQuery: jest.fn(),
  useGetMatchupHistoryQuery: jest.fn(),
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

const league = {
  currentWeek: 1,
  matchupSettings: { format: 'head_to_head' },
};

function renderedText(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

async function renderMatchup() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <MatchupTab leagueId="league-1" league={league} />,
    );
  });
  return renderer;
}

describe('MatchupTab states', () => {
  beforeEach(() => {
    mockRefetch.mockClear();
    mockUseGetCurrentMatchupQuery.mockReset();
  });

  it('renders loading, API error, and empty matchup states distinctly', async () => {
    mockUseGetCurrentMatchupQuery.mockReturnValueOnce({
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: mockRefetch,
    });
    expect(renderedText(await renderMatchup())).toContain('Loading matchup...');

    mockUseGetCurrentMatchupQuery.mockReturnValueOnce({
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: mockRefetch,
    });
    expect(renderedText(await renderMatchup())).toContain('Unable to Load Matchup');

    mockUseGetCurrentMatchupQuery.mockReturnValueOnce({
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRefetch,
    });
    expect(renderedText(await renderMatchup())).toContain('No Matchup Scheduled');
  });

  it('preserves real zero and negative scores and does not invent missing values', async () => {
    mockUseGetCurrentMatchupQuery.mockReturnValue({
      currentData: {
        result: { status: 'tied' },
        myTeam: {
          teamName: 'Comets',
          score: 0,
          starters: [
            { seasonAthleteId: 'a1', name: 'A', fantasyPoints: 0 },
            { seasonAthleteId: 'a2', name: 'B', fantasyPoints: -3 },
          ],
        },
        opponent: {
          teamName: 'Stars',
          score: -5,
          starters: [
            { seasonAthleteId: 'a3', name: 'C', fantasyPoints: 7 },
            { seasonAthleteId: 'a4', name: 'D' },
          ],
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRefetch,
    });

    const text = renderedText(await renderMatchup());
    ['0', '-5', '0 pts', '-3 pts', '+7 pts', 'Not scored'].forEach((value) =>
      expect(text).toContain(JSON.stringify(value)),
    );
    expect(text).toContain('Status unavailable');
  });
});
