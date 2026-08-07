import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import EditProfileScreen from '../src/screens/Profile/EditProfileScreen';

const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      avatar: { savedAvatars: [] },
      auth: { user: { fullName: 'Old name', username: 'old-name' } },
    }),
}));

jest.mock('../src/store/api/usersApi', () => ({
  useGetMeQuery: () => ({
    data: { data: { fullName: 'New name', username: 'new-name' } },
    isLoading: false,
  }),
  useUpdateMeMutation: () => [jest.fn(), { isLoading: false }],
}));

jest.mock('../src/store/slices/authSlice', () => ({
  updateUser: (payload: unknown) => ({ type: 'auth/updateUser', payload }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = () => React.createElement(View);
  return {
    ChevronLeft: Icon,
    Settings: Icon,
    Edit2: Icon,
    User: Icon,
    MapPin: Icon,
    Users: Icon,
    ChevronDown: Icon,
    Home: Icon,
  };
});

test('loading profile data does not dispatch an auth update', async () => {
  mockDispatch.mockClear();

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<EditProfileScreen />);
  });

  expect(mockDispatch).not.toHaveBeenCalled();
});
