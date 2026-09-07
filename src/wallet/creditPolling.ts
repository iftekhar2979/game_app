import type { CoinOrder } from '../store/api/walletApi';

/**
 * How the app waits for coins after a card is charged.
 *
 * The payment sheet succeeding means the money moved, not that the coins have
 * landed: crediting happens when Stripe's webhook reaches our server, which is
 * usually immediate and occasionally is not. Polling the reconcile endpoint
 * bridges that gap, and because crediting is keyed on the payment intent, a
 * poll racing the webhook still credits exactly once.
 */

/** Terminal states - polling stops here rather than waiting out the schedule. */
const SETTLED: CoinOrder['status'][] = [
  'credited',
  'failed',
  'expired',
  'refunded',
];

export function isSettled(status: CoinOrder['status'] | undefined): boolean {
  return !!status && SETTLED.includes(status);
}

/**
 * Backoff between polls, in milliseconds.
 *
 * Front-loaded because the webhook nearly always arrives within a second or
 * two, then spaced out so a genuinely delayed one is still caught without
 * hammering the server. Roughly 30 seconds across the whole schedule.
 */
const SCHEDULE = [400, 800, 1500, 2500, 4000, 6000, 8000];

export function nextPollDelay(attempt: number): number {
  if (attempt < 0) return SCHEDULE[0];
  return SCHEDULE[Math.min(attempt, SCHEDULE.length - 1)];
}

/** How many polls before giving up and telling the user it is still pending. */
export const MAX_POLL_ATTEMPTS = SCHEDULE.length;

export interface TopUpOutcome {
  tone: 'success' | 'error' | 'info';
  title: string;
  detail: string;
}

/**
 * What to tell the user once polling stops.
 *
 * An order still pending after the schedule is deliberately *not* an error:
 * the money is taken and the server will credit it when the webhook lands, so
 * saying "failed" would be a lie that invites a second payment.
 */
export function describeTopUpOutcome(
  order: Pick<CoinOrder, 'status' | 'coins' | 'failureReason'> | undefined,
): TopUpOutcome {
  if (!order) {
    return {
      tone: 'info',
      title: 'Payment received',
      detail: 'Your coins will appear in your wallet shortly.',
    };
  }

  switch (order.status) {
    case 'credited':
      return {
        tone: 'success',
        title: 'Coins added',
        detail: `${order.coins} coins are in your wallet.`,
      };
    case 'failed':
      return {
        tone: 'error',
        title: 'Payment failed',
        detail: order.failureReason || 'Your card was not charged.',
      };
    case 'expired':
      return {
        tone: 'error',
        title: 'Payment expired',
        detail: 'That payment timed out. You have not been charged.',
      };
    case 'refunded':
      return {
        tone: 'info',
        title: 'Payment refunded',
        detail: 'This purchase was refunded.',
      };
    default:
      return {
        tone: 'info',
        title: 'Payment received',
        detail:
          'Your coins will appear in your wallet shortly. You have not been charged twice.',
      };
  }
}

/**
 * Turns a Stripe sheet error into something worth reading.
 *
 * A cancellation is not a failure - the user closed the sheet - and must not
 * be reported as one.
 */
export function describeSheetError(error: any): TopUpOutcome | null {
  const code = error?.code;
  if (code === 'Canceled' || code === 'Cancelled') return null;

  return {
    tone: 'error',
    title: 'Payment not completed',
    detail: error?.message || 'Your card was not charged.',
  };
}
