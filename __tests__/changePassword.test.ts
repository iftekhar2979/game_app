import {
  changePasswordErrorMessage,
  hasErrors,
  isSocialOnlyAccountError,
  isWrongCurrentPasswordError,
  validateChangePassword,
} from '../src/screens/Profile/changePassword';

const valid = {
  currentPassword: 'old-secret',
  newPassword: 'new-secret',
  confirmPassword: 'new-secret',
};

describe('validating a password change', () => {
  it('accepts a complete, matching change', () => {
    expect(hasErrors(validateChangePassword(valid))).toBe(false);
  });

  it('requires every field', () => {
    const errors = validateChangePassword({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['confirmPassword', 'currentPassword', 'newPassword'],
    );
  });

  it('matches the server minimum of six characters', () => {
    expect(
      validateChangePassword({ ...valid, newPassword: 'abc12', confirmPassword: 'abc12' })
        .newPassword,
    ).toMatch(/at least 6/);
    expect(
      hasErrors(
        validateChangePassword({ ...valid, newPassword: 'abc123', confirmPassword: 'abc123' }),
      ),
    ).toBe(false);
  });

  it('refuses a new password identical to the current one', () => {
    expect(
      validateChangePassword({
        currentPassword: 'same-pass',
        newPassword: 'same-pass',
        confirmPassword: 'same-pass',
      }).newPassword,
    ).toMatch(/different/);
  });

  it('requires the confirmation to match', () => {
    expect(
      validateChangePassword({ ...valid, confirmPassword: 'new-secreT' }).confirmPassword,
    ).toMatch(/do not match/);
  });
});

describe('reading server errors', () => {
  const error = (message: string) => ({ status: 400, data: { message } });

  it('recognises a wrong current password', () => {
    const wrong = error('Invalid current password');
    expect(isWrongCurrentPasswordError(wrong)).toBe(true);
    expect(changePasswordErrorMessage(wrong)).toBe('Your current password is incorrect.');
  });

  it('recognises an account that signed up with Google, Apple or Facebook', () => {
    expect(
      isSocialOnlyAccountError(
        error('This account does not have a password yet. Use "forgot password" to set one.'),
      ),
    ).toBe(true);
  });

  it('explains a network failure plainly', () => {
    expect(changePasswordErrorMessage({ status: 'FETCH_ERROR' })).toMatch(/connection/);
  });

  it('reads the first message when the server sends a list', () => {
    expect(changePasswordErrorMessage({ data: { message: ['newPassword too short'] } })).toBe(
      'newPassword too short',
    );
  });
});
