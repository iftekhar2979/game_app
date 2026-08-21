/**
 * Avatar domain types.
 *
 * Kept free of React Native imports so the config logic can be unit tested
 * without the RN module graph.
 */

export type AvatarTarget = 'female' | 'male';

/**
 * The layers a look is built from, in paint order (base first, hair last).
 * `bodyColor` is a skin overlay that only some bases use.
 */
export type AvatarSlot = 'bodyColor' | 'skirt' | 'shoes' | 'outfit' | 'hair';

export const AVATAR_SLOTS: AvatarSlot[] = ['bodyColor', 'skirt', 'shoes', 'outfit', 'hair'];

/** One selectable part. `id` is stable and must never be reused for other art. */
export interface AvatarAsset {
  id: string;
  target: AvatarTarget;
  /** Which base categories this part fits. */
  categories: number[];
  source: number;
}

export interface AvatarBase {
  id: string;
  target: AvatarTarget;
  category: number;
  isFullbody: boolean;
  source: number;
}

/**
 * What gets persisted to the backend as `avatarConfig`.
 *
 * Parts are referenced by **stable asset id**, never by array index — the old
 * shape stored indices into a filtered list, so adding or reordering any asset
 * silently changed what every saved avatar looked like.
 */
export interface AvatarConfig {
  version: number;
  /** Base asset id, e.g. `base_avatar_3`. */
  base: string;
  parts: Partial<Record<AvatarSlot, string | null>>;
  /** Hex tint applied to the hair layer, or null for the artwork's own colour. */
  hairColor: string | null;
}

/** A single resolved layer, ready to render. */
export interface AvatarLayer {
  slot: AvatarSlot | 'base' | 'eyes';
  assetId: string;
  source: number;
  /** Only set for the hair layer when the user picked a tint. */
  tint?: string | null;
}
