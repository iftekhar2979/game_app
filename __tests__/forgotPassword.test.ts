import {
  isValidEmail,
  normaliseEmail,
  resolveForgotPasswordOutcome,
} from '../src/screens/Auth/forgotPassword';

/**
 * Reading what a forgot-password response actually means.
 *
 * The endpoint answers 200 either way - it will not confirm whether an email
 * belongs to an account - so the only thing separating "a code is on its way"
 * from "no such account" is whether a reset session came back with it.
 *
 * Getting that wrong is what left the screen inert: a missing token was
 * treated as a soft "check your email", which faded after three seconds and
 * left the user on a form that had not moved.
 */

describe('reading the response', () => {
  it('reports a session when one came back', () => {
    const outcome = resolveForgotPasswordOutcome({
      message: 'Verification code sent to your email.',
      data: { accessToken: 'jwt-token' },
    });

    expect(outcome).toEqual({ kind: 'sent', token: 'jwt-token' });
  });

  it('reports no account when the data is empty', () => {
    // The real shape for an unknown email: 200, a reassuring message, and an
    // empty object where the session would be.
    const outcome = resolveForgotPasswordOutcome({
      message: 'If an account exists, a verification code has been sent.',
      data: {},
    });

    expect(outcome).toEqual({ kind: 'no-account' });
  });

  it('reports no account when there is no data at all', () => {
    expect(resolveForgotPasswordOutcome({ message: 'ok' })).toEqual({
      kind: 'no-account',
    });
    expect(resolveForgotPasswordOutcome(undefined)).toEqual({ kind: 'no-account' });
    expect(resolveForgotPasswordOutcome(null)).toEqual({ kind: 'no-account' });
  });

  it('treats a blank token as no session rather than as one', () => {
    // An empty string is falsy, but a `!== undefined` check would let it
    // through - and it becomes an Authorization header of `Bearer `, which
    // fails later and somewhere else.
    for (const accessToken of ['', '   ']) {
      expect(resolveForgotPasswordOutcome({ message: 'ok', data: { accessToken } })).toEqual(
        { kind: 'no-account' },
      );
    }
  });

  it('never returns a session without a token to use', () => {
    // The screen reads `outcome.token` on the `sent` branch, so the two must
    // not be able to disagree.
    const outcome = resolveForgotPasswordOutcome({
      message: 'ok',
      data: { accessToken: 'abc' },
    });

    if (outcome.kind === 'sent') {
      expect(outcome.token).toBeTruthy();
    } else {
      throw new Error('expected a session');
    }
  });
});

describe('normalising the email', () => {
  it('trims and lower-cases, which is how the account was stored', () => {
    expect(normaliseEmail('  Sallu@YopMail.com ')).toBe('sallu@yopmail.com');
  });

  it('leaves an already-normal address alone', () => {
    expect(normaliseEmail('a@b.co')).toBe('a@b.co');
  });
});

describe('catching a typo before the round trip', () => {
  it('accepts an ordinary address', () => {
    for (const email of ['a@b.co', 'sallu@yopmail.com', ' First.Last@sub.example.org ']) {
      expect(isValidEmail(email)).toBe(true);
    }
  });

  it('rejects what is obviously not one', () => {
    for (const email of ['', '   ', 'nobody', 'nobody@', '@example.com', 'a@b']) {
      expect(isValidEmail(email)).toBe(false);
    }
  });

  it('is loose on purpose', () => {
    // Email syntax cannot be captured by a regex, and rejecting an address the
    // server would accept is a worse failure than one wasted request.
    expect(isValidEmail("o'brien+tag@example.co.uk")).toBe(true);
  });
});
