/**
 * Draft configuration shared by the create-league screen and its tests.
 *
 * `type` and `orderStrategy` are two separate concepts. `random` is an order
 * strategy — it decides how the initial team order is generated — and is never
 * a draft type. Sending `type: 'random'` is rejected by the server's DraftType
 * enum, which is `auction | snake | linear | offline`.
 */
export type DraftTypeValue = 'auction' | 'snake' | 'linear' | 'offline';
export type DraftOrderStrategyValue = 'random' | 'manual' | 'reverse_standings';

export interface DraftTypeOption {
  value: DraftTypeValue;
  supported: boolean;
}

/** Mirrors the server DraftType enum; only implemented engines are selectable. */
export const DRAFT_TYPE_OPTIONS: DraftTypeOption[] = [
  { value: 'auction', supported: true },
  { value: 'snake', supported: true },
  { value: 'linear', supported: false },
  { value: 'offline', supported: false },
];

export const isDraftTypeSupported = (value: DraftTypeValue): boolean =>
  DRAFT_TYPE_OPTIONS.some((o) => o.value === value && o.supported);

export interface DraftSettingsInput {
  type: DraftTypeValue;
  startingBudget: number;
  minimumBid: number;
  bidIncrement: number;
  nominationDurationSeconds: number;
  biddingDurationSeconds: number;
  pickDurationSeconds: number;
  draftStartsAt?: string;
}

/**
 * Builds the draftSettings payload. The order strategy is always sent alongside
 * the type, never in place of it.
 */
export function buildDraftSettings(input: DraftSettingsInput) {
  return {
    type: input.type,
    orderStrategy: 'random' as DraftOrderStrategyValue,
    startingBudget: input.startingBudget,
    minimumBid: input.minimumBid,
    bidIncrement: input.bidIncrement,
    nominationDurationSeconds: Math.min(300, Math.max(10, input.nominationDurationSeconds || 30)),
    biddingDurationSeconds: Math.min(300, Math.max(10, input.biddingDurationSeconds || 15)),
    pickDurationSeconds: input.pickDurationSeconds,
    draftStartsAt: input.draftStartsAt,
  };
}
