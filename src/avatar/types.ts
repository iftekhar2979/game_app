/**
 * Avatar domain types.
 *
 * Kept free of React Native imports so the config logic can be unit tested
 * without the RN module graph.
 */

export type AvatarTarget = 'female' | 'male';

/**
 * Where one layer's artwork comes from.
 *
 * A bundled `require()` handle is a number; remote artwork is the `{ uri }`
 * shape React Native's `<Image source>` already accepts, so widening this costs
 * the renderers nothing. Bundled stays first-class: it is the fallback whenever
 * the catalogue is unreachable or an asset has no uploaded artwork yet.
 */
export type AssetSource = number | { uri: string };

/** Narrows to the remote arm, which is the only one that can fail to load. */
export function isRemoteSource(
  source: AssetSource | null | undefined,
): source is { uri: string } {
  return typeof source === 'object' && source !== null && typeof source.uri === 'string';
}

/**
 * The layers a look is built from, in paint order (base first, hair last).
 * `bodyColor` is a skin overlay that only some bases use.
 */
export type AvatarSlot = 'bodyColor' | 'skirt' | 'shoes' | 'outfit' | 'hair';

export const AVATAR_SLOTS: AvatarSlot[] = ['bodyColor', 'skirt', 'shoes', 'outfit', 'hair'];

/**
 * One selectable part. `id` is stable and must never be reused for other art.
 *
 * There is deliberately no field here saying which bodies this fits. That used
 * to be `categories`, and the app matching on it locally is what let one
 * character's garments appear on another. A part is wearable by exactly the
 * character whose scoped listing produced it, so the question is answered
 * before this type exists and cannot be re-asked from it.
 */
export interface AvatarAsset {
  id: string;
  /** Display metadata, carried for labelling. Never compatibility. */
  target: AvatarTarget;
  /** Bundled artwork. Remote artwork overrides this at resolve time. */
  source: AssetSource;
}

export interface AvatarBase {
  id: string;
  target: AvatarTarget;
  isFullbody: boolean;
  /** Bundled artwork. Remote artwork overrides this at resolve time. */
  source: AssetSource;
  /**
   * The Base Avatar this body belongs to, and the thing its wardrobe is keyed
   * on. `male_avatar_1` in light and dark is two bodies of one character, so
   * both resolve the same assets.
   *
   * This replaced `category`, a number the body and each garment had to agree
   * on. The number was only ever a proxy for "these share a wardrobe", and two
   * unrelated bodies could hold the same one.
   */
  characterId: string;
  /** Which variant this is within `characterId`, e.g. `light`. */
  bodyColorId?: string | null;
  /** Whether this body blinks. Off leaves the eyes as the artwork drew them. */
  blinkEnabled?: boolean;
  /**
   * Eye overlays from the catalogue. Absent falls back to the bundled ones,
   * which is what every body that shipped with the app does.
   */
  normalEyeSource?: AssetSource | null;
  blinkEyeSource?: AssetSource | null;
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
  source: AssetSource;
  /** Only set for the hair layer when the user picked a tint. */
  tint?: string | null;
}
