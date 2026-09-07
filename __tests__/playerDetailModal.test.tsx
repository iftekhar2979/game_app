import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';

const mockAddFreeAgent = jest.fn();
const mockShowToast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};

jest.mock('../src/store/api/leagueApi', () => ({
  useGetRosterSettingsQuery: () => ({
    data: {
      divisionRules: [
        {
          divisionCode: 'SMALL_COED',
          divisionName: 'Small Coed',
          exactTeamCount: 1,
        },
      ],
    },
  }),
  useUpdateRosterSettingsMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateLeagueMutation: () => [jest.fn(), { isLoading: false }],
  useGetLeagueMembersQuery: () => ({ data: [] }),
  useRemoveLeagueMemberMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateMemberRoleMutation: () => [jest.fn(), { isLoading: false }],
}));

jest.mock('../src/store/api/cheerApi', () => ({
  useAddFantasyCheerFreeAgentMutation: () => [
    mockAddFreeAgent,
    { isLoading: false },
  ],
  useGetFantasyCheerRosterQuery: () => ({ data: { players: [] } }),
  useReleaseFantasyCheerTeamMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateFantasyCheerLineupMutation: () => [jest.fn(), { isLoading: false }],
}));

jest.mock('../src/utils/toast', () => ({ showToast: mockShowToast }));

const {
  PlayerDetailModal,
} = require('../src/components/LeagueDetail/LeagueDetailModals');

const player = {
  _id: 'sct-1',
  seasonCheerTeamId: 'sct-1',
  name: 'Cheer Athletics Panthers',
  eligibleDivisionIds: [
    { _id: 'div-1', code: 'SMALL_COED', name: 'Small Coed' },
  ],
};

const onClose = jest.fn();
const onAddSuccess = jest.fn();

const renderModal = () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PlayerDetailModal
        isVisible
        onClose={onClose}
        selectedPlayer={player}
        seasonId="season-1"
        leagueId="league-1"
        userTeamId="team-1"
        onAddSuccess={onAddSuccess}
      />,
    );
  });
  return tree;
};

/** Every string rendered inside a Text node. */
const visibleText = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .flatMap(node => React.Children.toArray(node.props.children))
    .filter(child => typeof child === 'string')
    .join(' | ');

/** Presses the nearest pressable ancestor of a label. */
const pressByLabel = async (
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) => {
  const candidates = tree.root.findAllByType(Text).filter(node =>
    React.Children.toArray(node.props.children).some(
      child => typeof child === 'string' && child.includes(label),
    ),
  );
  for (const candidate of candidates) {
    let node: any = candidate.parent;
    while (node && typeof node.props?.onPress !== 'function') node = node.parent;
    if (node) {
      await ReactTestRenderer.act(async () => {
        await node.props.onPress();
      });
      return;
    }
  }
  throw new Error(`No pressable ancestor found for "${label}"`);
};

const pickDivisionAndAdd = async (tree: ReactTestRenderer.ReactTestRenderer) => {
  await pressByLabel(tree, 'Small Coed');
  await pressByLabel(tree, 'ADD');
};

describe('PlayerDetailModal add flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('closes and reports success through the toast', async () => {
    mockAddFreeAgent.mockReturnValue({ unwrap: async () => ({}) });
    const tree = renderModal();

    await pickDivisionAndAdd(tree);

    expect(onAddSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(mockShowToast.success).toHaveBeenCalledWith(
      'Cheer Team Added',
      expect.stringContaining('Cheer Athletics Panthers'),
    );
    tree.unmount();
  });

  // The toast is a root overlay and cannot paint above this Modal, so a failure
  // sent there would never be seen.
  it('shows a failure inline and keeps the modal open', async () => {
    mockAddFreeAgent.mockReturnValue({
      unwrap: async () => {
        throw {
          data: { message: 'Small Coed already has its exact allocation' },
        };
      },
    });
    const tree = renderModal();

    await pickDivisionAndAdd(tree);

    expect(visibleText(tree)).toContain('already has its exact allocation');
    expect(mockShowToast.error).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    tree.unmount();
  });

  it('lets the user retry after a failure', async () => {
    mockAddFreeAgent.mockReturnValueOnce({
      unwrap: async () => {
        throw { data: { message: 'Temporary failure' } };
      },
    });
    const tree = renderModal();
    await pickDivisionAndAdd(tree);
    expect(visibleText(tree)).toContain('Temporary failure');

    mockAddFreeAgent.mockReturnValue({ unwrap: async () => ({}) });
    await pickDivisionAndAdd(tree);

    expect(onClose).toHaveBeenCalled();
    expect(mockShowToast.success).toHaveBeenCalled();
    tree.unmount();
  });

  it('clears a previous failure when the division is chosen again', async () => {
    mockAddFreeAgent.mockReturnValue({
      unwrap: async () => {
        throw { data: { message: 'Temporary failure' } };
      },
    });
    const tree = renderModal();
    await pickDivisionAndAdd(tree);
    expect(visibleText(tree)).toContain('Temporary failure');

    await pressByLabel(tree, 'Small Coed');

    expect(visibleText(tree)).not.toContain('Temporary failure');
    tree.unmount();
  });
});
