/**
 * Change-password rules, kept pure so they are testable without a screen.
 *
 * The length floor matches the server's `ChangePasswordDto` (MinLength 6). A
 * stricter rule here than on sign-up would lock people out of keeping the
 * password they already have.
 */

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordValues, string>>;

export function validateChangePassword(values: ChangePasswordValues): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Enter your current password.';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Enter a new password.';
  } else if (values.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (values.newPassword.length > MAX_PASSWORD_LENGTH) {
    errors.newPassword = `Use ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  } else if (values.currentPassword && values.newPassword === values.currentPassword) {
    errors.newPassword = 'Choose a password different from your current one.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Re-enter your new password.';
  } else if (values.newPassword && values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function hasErrors(errors: ChangePasswordErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function serverMessage(error: any): string {
  const raw = error?.data?.message;
  return (Array.isArray(raw) ? raw[0] : raw) ?? '';
}

/**
 * An account created with Google, Apple or Facebook has no password, so there
 * is no "current password" to check. The server says so explicitly.
 */
export function isSocialOnlyAccountError(error: any): boolean {
  return /does not have a password/i.test(serverMessage(error));
}

export function isWrongCurrentPasswordError(error: any): boolean {
  return /invalid current password/i.test(serverMessage(error));
}

export function changePasswordErrorMessage(error: any): string {
  const message = serverMessage(error);

  if (/invalid current password/i.test(message)) {
    return 'Your current password is incorrect.';
  }
  if (/cannot be same/i.test(message)) {
    return 'Choose a password different from your current one.';
  }
  if (error?.status === 'FETCH_ERROR') {
    return 'Check your connection and try again.';
  }
  return message || 'Could not change your password. Please try again.';
}
