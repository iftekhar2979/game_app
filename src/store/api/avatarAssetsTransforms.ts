/**
 * Pure data helpers for the avatar catalogue: the wire format and its
 * translation into the model the pickers read.
 *
 * Kept free of any React Native or RTK Query import so it can be unit tested
 * directly, matching `socialTransforms.ts`.
 */

import { AvatarSlot } from '../../avatar/types';

/** Catalogue lifecycle, mirroring the backend enum. */
export type AvatarAssetLifecycle = 'active' | 'retired';

/** One catalogue row as the API sends it. */
export interface AvatarAssetResponse {
  id: string;
  key: string;
  slot: AvatarSlot | 'base';
  displayName: string;
  description: string | null;
  target: 'female' | 'male';
  categories: number[];
  isFullbody: boolean;
  /** Set when the artwork ships inside the app. */
  bundledId: string | null;
  /** Signed URL for uploaded artwork. Null for bundled assets. */
  imageUrl: string | null;
  previewUrl: string | null;
  lifecycle: AvatarAssetLifecycle;
  isFree: boolean;
  price: number;
  sortOrder: number;
  /** Present only on the player-facing listing. Free assets come back true. */
  owned?: boolean;
}

/**
 * The catalogue entry the app works with.
 *
 * `isOwned` and `isRetired` are derived here rather than asked of the backend,
 * because the wire format speaks in `owned` and `lifecycle` and there is no
 * reason to make every call site translate that.
 */
export interface AvatarCatalogueAsset {
  key: string;
  slot: AvatarSlot | 'base';
  displayName: string;
  target: 'female' | 'male';
  categories: number[];
  bundledId: string | null;
  imageUrl: string | null;
  isFree: boolean;
  isOwned: boolean;
  isRetired: boolean;
  price: number;
  sortOrder: number;
  /** Whether this may be chosen for a *new* configuration. */
  isSelectable: boolean;
}

/** Exported for tests: this is the whole of the wire-to-model translation. */
export const toCatalogueAsset = (raw: AvatarAssetResponse): AvatarCatalogueAsset => {
  const isRetired = raw.lifecycle === 'retired';
  // The backend already folds "free" into `owned`; the fallback keeps a stale
  // or partial payload from reading as "everything is locked".
  const isOwned = raw.owned ?? raw.isFree;

  return {
    key: raw.key,
    slot: raw.slot,
    displayName: raw.displayName,
    target: raw.target,
    categories: raw.categories ?? [],
    bundledId: raw.bundledId ?? null,
    imageUrl: raw.imageUrl ?? null,
    isFree: raw.isFree,
    isOwned,
    isRetired,
    price: raw.price ?? 0,
    sortOrder: raw.sortOrder ?? 0,
    // Retirement withdraws an asset from new selections; ownership gates the
    // rest. Neither affects whether an already-saved avatar renders it.
    isSelectable: !isRetired && isOwned,
  };
};

/** Turns the catalogue listing into the by-key lookup the pickers read. */
export const toCatalogueLookup = (
  rows?: AvatarAssetResponse[] | null,
): Record<string, AvatarCatalogueAsset> =>
  (rows || []).reduce<Record<string, AvatarCatalogueAsset>>((byKey, raw) => {
    byKey[raw.key] = toCatalogueAsset(raw);
    return byKey;
  }, {});


// ============================================================================
// Selection rules
// ============================================================================

export type AssetAvailability =
  /** Free, or paid and already owned. */
  | 'available'
  /** Paid and not owned. Shows a price and can be bought. */
  | 'locked'
  /** Withdrawn from the catalogue. Not selectable, still renderable. */
  | 'retired'
  /** The catalogue has not answered yet. */
  | 'loading'
  /**
   * The catalogue could not be reached, or does not list this asset.
   *
   * Deliberately distinct from `available`: claiming an asset is usable would
   * invite a save the backend then rejects, and claiming it is locked would
   * hide artwork the user may well own.
   */
  | 'unknown';

export interface AssetState {
  availability: AssetAvailability;
  /** True only when the asset may go into a new configuration. */
  isSelectable: boolean;
  /** Coin cost. Zero unless `locked`. */
  price: number;
  asset?: AvatarCatalogueAsset;
}

/**
 * What the picker may do with one asset.
 *
 * Pure so the rule table can be tested without a store: given the catalogue's
 * state and one entry, this is the whole decision.
 */
export function resolveAssetState(
  asset: AvatarCatalogueAsset | undefined,
  status: { isLoading: boolean; isError: boolean; hasData: boolean },
): AssetState {
  if (status.isLoading) return { availability: 'loading', isSelectable: false, price: 0 };
  if (status.isError || !status.hasData) {
    return { availability: 'unknown', isSelectable: false, price: 0 };
  }

  // Bundled artwork with no catalogue row - expected before the catalogue is
  // seeded. "We do not know" is the only honest answer.
  if (!asset) return { availability: 'unknown', isSelectable: false, price: 0 };

  if (asset.isRetired) {
    return { availability: 'retired', isSelectable: false, price: asset.price, asset };
  }

  if (!asset.isOwned) {
    return { availability: 'locked', isSelectable: false, price: asset.price, asset };
  }

  return { availability: 'available', isSelectable: true, price: 0, asset };
}

// ============================================================================
// Purchase failures
// ============================================================================

export interface PurchaseFailure {
  title: string;
  detail?: string;
  /** `info` for outcomes that are not really errors, such as already owning it. */
  tone: 'error' | 'info';
}

/**
 * Turns a purchase rejection into something worth reading.
 *
 * The backend distinguishes these cases by status and message; mirroring that
 * here is presentation, not a second copy of the rules — the transaction itself
 * stays entirely server-side.
 */
export function describePurchaseError(error: any): PurchaseFailure {
  const status = error?.status;
  const detail = error?.data?.message;

  if (status === 409) {
    return { title: 'Already yours', detail: 'You already own this one.', tone: 'info' };
  }

  if (status === 401) {
    return { title: 'Please sign in again', detail: 'Your session has expired.', tone: 'error' };
  }

  if (status === 400 && /coins/i.test(detail ?? '')) {
    return {
      title: 'Not enough coins',
      detail: 'Top up from your profile to unlock this.',
      tone: 'error',
    };
  }

  if (status === 400) {
    return {
      title: 'Unavailable',
      detail: detail || 'That asset can no longer be bought.',
      tone: 'error',
    };
  }

  return { title: 'Could not unlock that', detail: detail || 'Please try again.', tone: 'error' };
}
