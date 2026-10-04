import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import DatePicker from 'react-native-date-picker';
import BirthDateGate from '../src/components/Auth/BirthDateGate';

jest.mock('react-native-date-picker', () => () => null);

it('does not release an under-13 player into account creation', () => {
  const onEligible = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<BirthDateGate onEligible={onEligible} />);
  });

  const dateButton = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Date of birth');
  if (!dateButton) throw new Error('Missing date button');
  expect(renderer.root.findByType(DatePicker).props.open).toBe(false);
  act(() => dateButton.props.onPress());
  expect(renderer.root.findByType(DatePicker).props.open).toBe(true);
  act(() => renderer.root.findByType(DatePicker).props.onConfirm(new Date(new Date().getFullYear() - 10, 9, 3)));

  const continueButton = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel !== 'Date of birth');
  if (!continueButton) throw new Error('Missing continue button');
  act(() => continueButton.props.onPress());

  expect(onEligible).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(Text).some(node =>
    node.props.children === 'Ask a parent or guardian',
  )).toBe(true);
  expect(renderer.root.findAllByType(DatePicker)).toHaveLength(0);
});
