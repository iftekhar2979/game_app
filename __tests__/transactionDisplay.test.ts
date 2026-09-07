import {
  amountTone,
  describeTransaction,
  formatAmount,
  formatCoinBalance,
  formatPackagePrice,
  formatTransactionDate,
} from '../src/wallet/transactionDisplay';

const row = (over: any = {}) =>
  ({
    id: 't1',
    type: 'spend',
    amount: -50,
    balanceAfter: 100,
    referenceType: 'avatar_asset',
    referenceId: 'suit1',
    note: null,
    createdAt: '2026-09-07T10:00:00.000Z',
    ...over,
  }) as any;

describe('statement wording', () => {
  it('prefers the server note, which names the actual purchase', () => {
    expect(describeTransaction(row({ note: 'Unlocked Suit 1' }))).toBe('Unlocked Suit 1');
  });

  it('falls back to the movement type', () => {
    expect(describeTransaction(row({ note: null }))).toBe('Purchase');
    expect(describeTransaction(row({ type: 'topup', note: '  ' }))).toBe('Coins purchased');
    expect(describeTransaction(row({ type: 'reversal', note: null }))).toBe('Refunded');
  });

  it('never renders an empty row label', () => {
    expect(describeTransaction(row({ type: 'nonsense', note: null }))).toBe('Coin movement');
  });
});

describe('amounts', () => {
  // The direction comes from the signed ledger amount, never re-derived from
  // the type - an admin grant or reversal can go either way.
  it('signs credits and debits from the amount itself', () => {
    expect(formatAmount(120)).toBe('+120');
    expect(formatAmount(-50)).toBe('−50');
    expect(formatAmount(0)).toBe('0');
  });

  it('tones match the sign, not the type', () => {
    expect(amountTone(120)).toBe('credit');
    expect(amountTone(-50)).toBe('debit');
    expect(amountTone(0)).toBe('neutral');
  });

  it('survives a malformed amount', () => {
    expect(formatAmount(NaN)).toBe('—');
    expect(amountTone(NaN)).toBe('neutral');
  });
});

describe('balance', () => {
  // The reason this exists: the balance type used to name three fields the
  // server never sent, so a screen reading it got undefined.
  it('renders a missing balance as zero rather than blank', () => {
    expect(formatCoinBalance(undefined)).toBe('0');
    expect(formatCoinBalance(null)).toBe('0');
    expect(formatCoinBalance('nonsense')).toBe('0');
  });

  it('renders a real balance', () => {
    expect(formatCoinBalance(250)).toBe('250');
    expect(formatCoinBalance('250')).toBe('250');
  });

  it('never shows a negative balance to the user', () => {
    expect(formatCoinBalance(-5)).toBe('0');
  });
});

describe('package price', () => {
  // priceAmount is minor units; getting this wrong charges 100x.
  it('converts minor units to currency', () => {
    expect(formatPackagePrice(50)).toMatch(/0\.50/);
    expect(formatPackagePrice(1200)).toMatch(/12\.00/);
  });

  it('falls back for an unknown currency code', () => {
    expect(formatPackagePrice(100, 'NOTACURRENCY')).toBe('$1.00');
  });

  it('handles a missing amount', () => {
    expect(formatPackagePrice(undefined as any)).toMatch(/0\.00/);
  });
});

describe('dates', () => {
  it('formats a real timestamp', () => {
    expect(formatTransactionDate('2026-09-07T10:00:00.000Z')).toContain('2026');
  });

  it('returns nothing for an unparseable one', () => {
    expect(formatTransactionDate('nonsense')).toBe('');
  });
});
