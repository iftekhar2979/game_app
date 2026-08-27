import authReducer, {
  completeEmailVerification,
  finishAvatarSetup,
  logout,
  setCredentials,
  setResetPasswordToken,
  startEmailVerification,
  startPasswordReset,
} from '../src/store/slices/authSlice';

describe('authentication flow state', () => {
  it('keeps a newly registered account outside the app until its email is verified', () => {
    const pending = authReducer(
      undefined,
      startEmailVerification({
        token: 'registration-token',
        user: { email: 'new@example.com', fullName: 'New Member' },
      }),
    );

    expect(pending.isAuthenticated).toBe(false);
    expect(pending.pendingAuthFlow).toBe('emailVerification');
    expect(pending.token).toBe('registration-token');

    const verified = authReducer(pending, completeEmailVerification());
    expect(verified.isAuthenticated).toBe(true);
    expect(verified.pendingAuthFlow).toBeNull();
    expect(verified.needsAvatarSetup).toBe(true);

    const avatarSelected = authReducer(verified, finishAvatarSetup());
    expect(avatarSelected.needsAvatarSetup).toBe(false);
  });

  it('keeps password reset separate from an authenticated session', () => {
    const pending = authReducer(
      undefined,
      startPasswordReset({ email: 'member@example.com', token: 'otp-token' }),
    );
    const verifiedCode = authReducer(pending, setResetPasswordToken('reset-token'));

    expect(verifiedCode.isAuthenticated).toBe(false);
    expect(verifiedCode.pendingAuthFlow).toBe('passwordReset');
    expect(verifiedCode.resetPasswordToken).toBe('reset-token');
  });

  it('routes logout to Sign In and clears every temporary credential', () => {
    const authenticated = authReducer(
      undefined,
      setCredentials({ token: 'access-token', user: { email: 'member@example.com' } }),
    );
    const signedOut = authReducer(authenticated, logout());

    expect(signedOut).toMatchObject({
      isAuthenticated: false,
      token: null,
      pendingAuthFlow: null,
      resetPasswordToken: null,
      signedOutRoute: 'SignIn',
    });
  });
});
