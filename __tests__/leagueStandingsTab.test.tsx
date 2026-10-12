import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { LeagueTab } from '../src/components/LeagueDetail/LeagueDetailTabs';
import type { LeagueMatchScoresResponse } from '../src/store/api/leagueApi';

const mockUseGetLeagueStandingsQuery = jest.fn();

jest.mock('../src/store/api/leagueApi', () => ({
  useGetLeagueStandingsQuery: (...args: unknown[]) =>
    mockUseGetLeagueStandingsQuery(...args),
  useGetLeagueMatchScoresQuery: jest.fn(),
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

const matchScores: LeagueMatchScoresResponse = {
  leagueId: 'league-1',
  seasonId: 'season-1',
  matchNumber: 3,
  isCurrentMatch: true,
  entries: [
    { fantasyTeamId: 'team-a', displayName: 'hasan', points: 45.2, rank: 1, isCurrentUser: false },
    { fantasyTeamId: 'team-b', displayName: 'karim', points: 42.5, rank: 2, isCurrentUser: true },
  ],
  me: { fantasyTeamId: 'team-b', points: 42.5, rank: 2 },
};

it('shows public screen names and season totals without record or history UI', async () => {
  mockUseGetLeagueStandingsQuery.mockReturnValue({
    data: { standings: [
      { fantasyTeamId: 'team-a', teamName: 'Private Real Name A', rank: 1, pointsFor: 145.2 },
      { fantasyTeamId: 'team-b', teamName: 'Private Real Name B', rank: 2, pointsFor: 142 },
    ] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <LeagueTab
        leagueId="league-1"
        userTeamId="team-b"
        league={{ maxTeams: 6, visibility: 'private' }}
        matchScores={matchScores}
        matchScoresLoading={false}
        matchScoresError={false}
        onRetryScores={jest.fn()}
      />,
    );
  });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('hasan');
  expect(output).toContain('karim');
  expect(output).toContain('145.20');
  expect(output).toContain('142.00');
  expect(output).toContain('Total Points');
  expect(output).not.toContain('Private Real Name');
  expect(output).not.toContain('Matchup History');
  expect(output).not.toContain('PA:');
  const rows = renderer.root.findAll(node =>
    node.props.accessibilityState?.selected === true,
  );
  expect(rows.some(row => row.props.className?.includes('border-[#8B3DFF]'))).toBe(true);
});
