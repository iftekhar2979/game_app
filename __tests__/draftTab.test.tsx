import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { DraftTab } from '../src/components/LeagueDetail/LeagueDetailTabs';

jest.mock('../src/store/api/leagueApi', () => ({
  useGetCurrentMatchupQuery: jest.fn(),
  useGetLeagueMembersQuery: jest.fn(),
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
  id: 'league-1',
  maxTeams: 8,
  joinedTeamCount: 4,
  draftSettings: { type: 'auction', draftStartsAt: '2026-09-20T18:00:00.000Z' },
};

async function renderDraft(props: any) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <DraftTab
        league={league}
        navigation={{ navigate: jest.fn() }}
        isDraftStarted={false}
        {...props}
      />,
    );
  });
  return renderer;
}

/** The Draftroom button, found by the label it carries in either state. */
const draftroomButton = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAll(
      node =>
        typeof node.props?.disabled === 'boolean' &&
        typeof node.props?.onPress === 'function',
    )
    .find(node => JSON.stringify(node.props?.accessibilityState) !== undefined);

describe('Draftroom button while the countdown runs', () => {
  // The server refuses to start a draft before its scheduled time, so opening
  // the room early only shows a screen nothing can be done on.
  it('is disabled while time remains', async () => {
    const renderer = await renderDraft({
      timeLeft: { days: 0, hours: 2, minutes: 5, seconds: 30 },
    });

    const button = draftroomButton(renderer)!;
    expect(button.props.disabled).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain(
      'Draftroom opens at draft time',
    );
  });

  it('is enabled once the countdown reaches zero', async () => {
    const renderer = await renderDraft({
      timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    });

    const button = draftroomButton(renderer)!;
    expect(button.props.disabled).toBe(false);
    expect(JSON.stringify(renderer.toJSON())).toContain('"Draftroom"');
  });

  // No scheduled time at all must not lock managers out of the room.
  it('is enabled when the league has no draft time', async () => {
    const renderer = await renderDraft({ timeLeft: null });
    expect(draftroomButton(renderer)!.props.disabled).toBe(false);
  });

  it('does not navigate while disabled', async () => {
    const navigate = jest.fn();
    const renderer = await renderDraft({
      timeLeft: { days: 1, hours: 0, minutes: 0, seconds: 0 },
      navigation: { navigate },
    });

    const button = draftroomButton(renderer)!;
    expect(button.props.disabled).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
