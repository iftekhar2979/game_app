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
  /** Display metadata. Never compatibility - see `AvatarCatalogueAsset`. */
  target: 'female' | 'male';
  isFullbody: boolean;
  /** The Base Avatar this row belongs to. */
  characterId?: string | null;
  /** Base only. See `AvatarBase` for what each of these means. */
  bodyColorId?: string | null;
  blinkEnabled?: boolean;
  normalEyeUrl?: string | null;
  blinkEyeUrl?: string | null;
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
  /** Present only on a character-scoped listing. See `AvatarCatalogueAsset`. */
  assignmentSortOrder?: number;
  isShared?: boolean;
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
  /**
   * Gender, for display and routing only.
   *
   * Deliberately not used to decide what fits. Compatibility is not something
   * this model can express at all any more: an asset is wearable by exactly the
   * character whose scoped listing returned it, and there is no field here from
   * which a client could derive a second opinion. That is the point - the leak
   * this replaced came from the app matching `target` and `categories` itself.
   */
  target: 'female' | 'male';
  /**
   * Only meaningful for `slot: 'base'` - whether the body is drawn full length.
   *
   * Carried through because the editor sizes its stage from it.
   */
  isFullbody: boolean;
  /** The Base Avatar this row belongs to. */
  characterId?: string | null;
  bodyColorId?: string | null;
  blinkEnabled?: boolean;
  normalEyeUrl?: string | null;
  blinkEyeUrl?: string | null;
  bundledId: string | null;
  /** Uploaded full-resolution artwork. Null while the asset is bundle-only. */
  imageUrl: string | null;
  /** Smaller artwork for picker tiles. Null falls back to `imageUrl`. */
  previewUrl: string | null;
  isFree: boolean;
  isOwned: boolean;
  isRetired: boolean;
  price: number;
  sortOrder: number;
  /**
   * Where this sits in *this character's* picker.
   *
   * Sent per assignment rather than per asset, so a garment shared between two
   * characters can be arranged differently for each. Absent on a base and on
   * an unscoped response, where the asset's own `sortOrder` is the answer.
   */
  assignmentSortOrder?: number;
  /** Whether this asset is deliberately worn by more than one character. */
  isShared?: boolean;
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
    isFullbody: raw.isFullbody ?? true,
    characterId: raw.characterId ?? null,
    bodyColorId: raw.bodyColorId ?? null,
    blinkEnabled: raw.blinkEnabled ?? true,
    normalEyeUrl: raw.normalEyeUrl ?? null,
    blinkEyeUrl: raw.blinkEyeUrl ?? null,
    bundledId: raw.bundledId ?? null,
    imageUrl: raw.imageUrl ?? null,
    previewUrl: raw.previewUrl ?? null,
    isFree: raw.isFree,
    isOwned,
    isRetired,
    price: raw.price ?? 0,
    sortOrder: raw.sortOrder ?? 0,
    assignmentSortOrder: raw.assignmentSortOrder,
    isShared: raw.isShared,
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
  /**
   * The failure is a shortfall the user can fix by topping up, so the caller
   * should offer the coin store rather than only saying no. Told apart from
   * every other 400 because those cannot be resolved by buying coins.
   */
  canTopUp?: boolean;
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
      detail: 'Buy more coins to unlock this.',
      tone: 'error',
      canTopUp: true,
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

// ============================================================================
// Base Avatars (characters)
// ============================================================================

/** One Base Avatar as the API sends it, with its tone variants. */
export interface AvatarCharacterResponse {
  characterId: string;
  displayName: string;
  target: 'female' | 'male';
  sortOrder: number;
  variants: AvatarAssetResponse[];
  previewLayers?: AvatarPreviewLayerResponse[];
}

/** One garment a character's browse card is shown wearing. */
export interface AvatarPreviewLayerResponse {
  slot: AvatarSlot;
  key: string;
  bundledId: string | null;
  imageUrl: string | null;
}

/**
 * A Base Avatar and the skin tones it is offered in.
 *
 * The unit the picker shows and the unit a wardrobe belongs to. Three tones of
 * one character are three catalogue rows with three keys - three separate
 * things to price, retire and save against - but one silhouette, so the tone is
 * chosen inside the character rather than alongside it.
 */
export interface AvatarCharacter {
  characterId: string;
  displayName: string;
  target: 'female' | 'male';
  sortOrder: number;
  /** Every tone, in catalogue order. Never empty. */
  variants: AvatarCatalogueAsset[];
  /** The tone shown on the card and worn when none is chosen. */
  primary: AvatarCatalogueAsset;
  /**
   * What this character's browse card is shown wearing.
   *
   * Comes from the server as the assignments an admin marked as this
   * character's preview default, so a card can never advertise a character in
   * another character's clothes. Empty means the card shows the bare body,
   * which is the honest answer for a character nothing has been chosen for.
   */
  previewLayers: AvatarPreviewLayerResponse[];
}

/**
 * Turns the wire shape into the character model.
 *
 * Retired tones are dropped here rather than in the picker, because a tone
 * withdrawn from sale should not be offered - while a *saved* avatar built on
 * one keeps rendering, since rendering resolves a key directly and never
 * consults this list.
 */
export const toCharacter = (raw: AvatarCharacterResponse): AvatarCharacter => {
  const variants = (raw.variants ?? [])
    .map(toCatalogueAsset)
    .filter((variant) => !variant.isRetired);

  const usable = variants.length
    ? variants
    : (raw.variants ?? []).map(toCatalogueAsset);

  return {
    characterId: raw.characterId,
    displayName: raw.displayName,
    target: raw.target,
    sortOrder: raw.sortOrder ?? 0,
    variants: usable,
    primary: usable[0],
    previewLayers: raw.previewLayers ?? [],
  };
};

/** Characters keyed by id, for resolving a saved avatar's base. */
export const toCharacterLookup = (
  characters: AvatarCharacter[],
): Record<string, AvatarCharacter> =>
  characters.reduce<Record<string, AvatarCharacter>>((byId, character) => {
    byId[character.characterId] = character;
    return byId;
  }, {});

/** The character a base key belongs to, across every character loaded. */
export const characterOfBase = (
  characters: AvatarCharacter[],
  baseKey?: string | null,
): AvatarCharacter | undefined => {
  if (!baseKey) return undefined;
  return characters.find((character) =>
    character.variants.some((variant) => variant.key === baseKey),
  );
};
