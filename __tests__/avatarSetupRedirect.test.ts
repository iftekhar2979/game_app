jest.mock('../src/services/authStorage', () => ({
  authStorage: {
    getAccessToken: jest.fn(),
    clearSession: jest.fn(),
  },
}));

import { authService } from '../src/services/authService';
import { authStorage } from '../src/services/authStorage';
import { finishAvatarSetup, logout } from '../src/store/slices/authSlice';

const mockedStorage = authStorage as jest.Mocked<typeof authStorage>;

describe('post-registration avatar redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finishes setup so an authenticated account enters Home', async () => {
    mockedStorage.getAccessToken.mockResolvedValue('verified-access-token');
    const dispatch = jest.fn();

    await expect(
      authService.handleAvatarSetupCompleted(dispatch as any),
    ).resolves.toBe('home');

    expect(dispatch).toHaveBeenCalledWith(finishAvatarSetup());
    expect(mockedStorage.clearSession).not.toHaveBeenCalled();
  });

  it('clears stale state so an account without a session returns to Sign In', async () => {
    mockedStorage.getAccessToken.mockResolvedValue(null);
    const dispatch = jest.fn();

    await expect(
      authService.handleAvatarSetupCompleted(dispatch as any),
    ).resolves.toBe('signIn');

    expect(mockedStorage.clearSession).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(logout());
    expect(dispatch).not.toHaveBeenCalledWith(finishAvatarSetup());
  });
});
