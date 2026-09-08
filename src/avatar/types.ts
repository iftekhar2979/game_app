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

/** One selectable part. `id` is stable and must never be reused for other art. */
export interface AvatarAsset {
  id: string;
  target: AvatarTarget;
  /** Which base categories this part fits. */
  categories: number[];
  /** Bundled artwork. Remote artwork overrides this at resolve time. */
  source: AssetSource;
}

export interface AvatarBase {
  id: string;
  target: AvatarTarget;
  category: number;
  isFullbody: boolean;
  /** Bundled artwork. Remote artwork overrides this at resolve time. */
  source: AssetSource;
  /**
   * Groups the colour variants of one character, so `male_avatar_1` in light
   * and dark reads as one body offered in two tones rather than two bodies.
   * Absent on a base that stands alone.
   */
  characterId?: string | null;
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
