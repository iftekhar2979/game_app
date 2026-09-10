import type { ForgotPasswordResponse } from '../../store/api/authApi';

/**
 * What a forgot-password request actually means.
 *
 * The endpoint answers 200 either way - it will not confirm whether an email
 * belongs to an account - and the only thing separating the two cases is
 * whether a reset session came back with it:
 *
 *   known email    -> { message, data: { accessToken } }
 *   unknown email  -> { message, data: {} }
 *
 * Reading that difference is the whole job, and getting it wrong is what left
 * the screen inert: it treated the token as optional, showed a toast when it
 * was missing, and returned - so an email with a typo in it produced a message
 * that faded after three seconds and a screen that had not moved.
 *
 * Kept pure so both branches can be tested without a store, a navigator or a
 * network.
 */

export type ForgotPasswordOutcome =
  | {
      /** A reset session exists; the code is on its way. */
      kind: 'sent';
      token: string;
    }
  | {
      /**
       * No account, so no session and nothing to verify.
       *
       * Deliberately distinguished rather than folded into a generic "check
       * your email". Sending the user to an OTP screen with no session would
       * mean a code that can never be accepted, and a second dead end further
       * in is worse than an honest one here.
       */
      kind: 'no-account';
    };

export function resolveForgotPasswordOutcome(
  response: ForgotPasswordResponse | undefined | null,
): ForgotPasswordOutcome {
  const token = response?.data?.accessToken;

  // Guarded on content, not just presence: an empty string is falsy but would
  // survive a `!== undefined` check and become an Authorization header of
  // `Bearer `, which fails later and further away.
  return typeof token === 'string' && token.trim()
    ? { kind: 'sent', token }
    : { kind: 'no-account' };
}

/** Lower-cased and trimmed, which is how the account was stored. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Enough of a check to catch a typo before a round trip.
 *
 * Deliberately loose. Email syntax is famously unrepresentable in a regex, and
 * a strict pattern here would reject a valid address the server is happy with -
 * which is a worse failure than one wasted request.
 */
export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(normaliseEmail(email));
}
