import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import LeagueCreationCallToAction from '../src/components/LeagueCreationCallToAction';

const textContent = (node: any): string => {
  if (typeof node === 'string') return node;
  if (!node?.children) return '';
  return node.children.map(textContent).join(' ');
};

describe('Cheer Battle League creation action', () => {
  it('is clearly labeled and opens the create flow when pressed', () => {
    const onPress = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <LeagueCreationCallToAction onPress={onPress} />,
      );
    });

    const button = renderer!.root.findByProps({
      testID: 'create-cheer-battle-league',
    });
    expect(textContent(button)).toContain('Create Cheer Battle League');
    expect(textContent(button)).toContain('Draft real-world cheer teams');

    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
