import {
  describeSheetError,
  describeTopUpOutcome,
  isSettled,
  MAX_POLL_ATTEMPTS,
  nextPollDelay,
} from '../src/wallet/creditPolling';

describe('when to stop polling', () => {
  it('stops on every terminal state', () => {
    expect(isSettled('credited')).toBe(true);
    expect(isSettled('failed')).toBe(true);
    expect(isSettled('expired')).toBe(true);
    expect(isSettled('refunded')).toBe(true);
  });

  it('keeps polling while the order is still open', () => {
    expect(isSettled('pending')).toBe(false);
    expect(isSettled('paid')).toBe(false);
    expect(isSettled(undefined)).toBe(false);
  });
});

describe('backoff', () => {
  it('polls quickly at first, since the webhook usually lands immediately', () => {
    expect(nextPollDelay(0)).toBeLessThanOrEqual(500);
  });

  it('spaces polls out rather than hammering the server', () => {
    const delays = Array.from({ length: MAX_POLL_ATTEMPTS }, (_, i) => nextPollDelay(i));
    for (let i = 1; i < delays.length; i += 1) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });

  it('waits long enough overall for a delayed webhook', () => {
    const total = Array.from({ length: MAX_POLL_ATTEMPTS }, (_, i) =>
      nextPollDelay(i),
    ).reduce((sum, ms) => sum + ms, 0);
    expect(total).toBeGreaterThan(15_000);
  });

  it('never returns a negative or unbounded delay', () => {
    expect(nextPollDelay(-1)).toBeGreaterThan(0);
    expect(nextPollDelay(999)).toBeLessThanOrEqual(10_000);
  });
});

describe('what the user is told', () => {
  it('confirms the coins once they are credited', () => {
    const outcome = describeTopUpOutcome({
      status: 'credited',
      coins: 250,
      failureReason: null,
    });

    expect(outcome.tone).toBe('success');
    expect(outcome.detail).toContain('250');
  });

  it('reports a decline with the reason the provider gave', () => {
    const outcome = describeTopUpOutcome({
      status: 'failed',
      coins: 250,
      failureReason: 'Card declined',
    });

    expect(outcome.tone).toBe('error');
    expect(outcome.detail).toBe('Card declined');
  });

  /**
   * The important one: money has been taken and the server will credit it when
   * the webhook lands. Calling that a failure would invite a second payment.
   */
  it('does not call a still-pending order a failure', () => {
    const outcome = describeTopUpOutcome({
      status: 'pending',
      coins: 250,
      failureReason: null,
    });

    expect(outcome.tone).not.toBe('error');
    expect(outcome.detail).toMatch(/shortly/i);
  });

  it('says the same when the order could not be read at all', () => {
    expect(describeTopUpOutcome(undefined).tone).not.toBe('error');
  });

  it('reassures that a pending payment was not double-charged', () => {
    const outcome = describeTopUpOutcome({
      status: 'paid',
      coins: 100,
      failureReason: null,
    });

    expect(outcome.detail).toMatch(/twice/i);
  });
});

describe('sheet errors', () => {
  // Closing the sheet is a decision, not a failure.
  it('treats a cancellation as nothing to report', () => {
    expect(describeSheetError({ code: 'Canceled' })).toBeNull();
    expect(describeSheetError({ code: 'Cancelled' })).toBeNull();
  });

  it('reports a real failure with the provider message', () => {
    const outcome = describeSheetError({ code: 'Failed', message: 'Card declined' });

    expect(outcome).toMatchObject({ tone: 'error', detail: 'Card declined' });
  });

  it('falls back when the provider says nothing useful', () => {
    expect(describeSheetError({ code: 'Failed' })?.detail).toMatch(/not charged/i);
  });
});
