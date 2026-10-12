import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('lucide-react-native', () => {
  const MockReact = require('react');
  const { View: MockView } = require('react-native');
  const Icon = () => MockReact.createElement(MockView);
  return new Proxy({}, { get: () => Icon });
});

jest.mock('../src/store/api/leagueApi', () => ({
  useGetLeagueMatchScoresQuery: jest.fn(),
  useGetLeagueStandingsQuery: jest.fn(),
}));
jest.mock('../src/components/LeagueDetail/RosterPlayerRow', () => ({ RosterSections: () => null }));

import { ScoringRulesTab } from '../src/components/LeagueDetail/LeagueDetailTabs';

it('explains the formula and the client example', () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<ScoringRulesTab />); });
  const tree = JSON.stringify(renderer.toJSON());
  expect(tree).toContain('Hit zero deductions');
  expect(tree).toContain('Teams beaten in the division');
  expect(tree).toContain('Grand Champion');
  expect(tree).toContain('10.21');
});
