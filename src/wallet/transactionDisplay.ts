import type { CoinTransaction } from '../store/api/walletApi';

/**
 * Presentation rules for the coin statement.
 *
 * Kept separate from the screen so the sign, wording and grouping can be tested
 * without rendering: a statement that mislabels a debit as a credit is a
 * trust problem, not a cosmetic one.
 */

/** What the user calls each kind of movement. */
const TYPE_LABELS: Record<CoinTransaction['type'], string> = {
  topup: 'Coins purchased',
  spend: 'Purchase',
  grant: 'Gift',
  reversal: 'Refunded',
  adjustment: 'Adjustment',
};

export function describeTransaction(row: CoinTransaction): string {
  // The server's note is the specific one ("Unlocked Black shirt 2 1"); the
  // type label is the fallback when there is none.
  return row.note?.trim() || TYPE_LABELS[row.type] || 'Coin movement';
}

/**
 * The amount as it should read, with an explicit sign.
 *
 * The ledger already signs `amount`, so this never re-derives the direction
 * from the type - a grant and a reversal are both possible in either direction
 * once an admin gets involved.
 */
export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${Math.abs(amount)}`;
}

/** Credits read positive and green, debits negative and red. */
export function amountTone(amount: number): 'credit' | 'debit' | 'neutral' {
  if (!Number.isFinite(amount) || amount === 0) return 'neutral';
  return amount > 0 ? 'credit' : 'debit';
}

/** Short, local date for a statement row. */
export function formatTransactionDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** A balance is never shown as blank or NaN; an unknown one reads as zero. */
export function formatCoinBalance(value: unknown): string {
  const coins = Number(value);
  return Number.isFinite(coins) ? String(Math.max(0, Math.trunc(coins))) : '0';
}

/**
 * Price in the currency the package is sold in.
 *
 * `priceAmount` is minor units, as Stripe expects, so it is divided here rather
 * than anywhere a mistake would silently charge a hundred times too much.
 */
export function formatPackagePrice(minorUnits: number, currency = 'USD'): string {
  const major = (Number(minorUnits) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
    }).format(major);
  } catch {
    return `$${major.toFixed(2)}`;
  }
}
