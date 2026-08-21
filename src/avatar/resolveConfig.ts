import { getAssetById, getBaseById, listFor, REGISTRY_VERSION } from './registry';
import { AVATAR_SLOTS, AvatarBase, AvatarConfig, AvatarLayer, AvatarSlot } from './types';

/**
 * Config ⇄ layers.
 *
 * Everything here degrades rather than throws. A saved avatar can reference a
 * part that has since been renamed or pulled from the app: the right behaviour
 * is to drop that one layer, not to crash the profile screen or lose the whole
 * look.
 */

/** A brand-new look for a base: no parts chosen, artwork's own hair colour. */
export function emptyConfig(base: AvatarBase): AvatarConfig {
  return {
    version: REGISTRY_VERSION,
    base: base.id,
    parts: { bodyColor: null, skirt: null, shoes: null, outfit: null, hair: null },
    hairColor: null,
  };
}

/**
 * A sensible starting look — the first available part in each slot.
 * Used for the picker previews and as the editor's initial state.
 */
export function defaultConfig(base: AvatarBase): AvatarConfig {
  const parts: AvatarConfig['parts'] = {};

  for (const slot of AVATAR_SLOTS) {
    const options = listFor(slot, base.target, base.category);
    parts[slot] = options.length ? options[0].id : null;
  }

  return { version: REGISTRY_VERSION, base: base.id, parts, hairColor: null };
}

/**
 * Turns a stored config into an ordered list of renderable layers.
 *
 * Returns `[]` for an unknown base, since without a body there is nothing
 * coherent to draw.
 */
export function resolveConfig(config?: AvatarConfig | null): AvatarLayer[] {
  const base = getBaseById(config?.base);
  if (!config || !base) return [];

  const layers: AvatarLayer[] = [
    { slot: 'base', assetId: base.id, source: base.source },
  ];

  for (const slot of AVATAR_SLOTS) {
    const assetId = config.parts?.[slot];
    if (!assetId) continue;

    const asset = getAssetById(slot, assetId);
    // Unknown id: the art was removed or renamed. Skip the layer.
    if (!asset) continue;

    layers.push({
      slot,
      assetId: asset.id,
      source: asset.source,
      ...(slot === 'hair' ? { tint: config.hairColor ?? null } : {}),
    });
  }

  return layers;
}

/**
 * Normalises anything that came back from the server into a usable config.
 *
 * Old documents stored `{ target, avatarCategory, isFullbody, details: {...} }`
 * with numeric array indices, which cannot be mapped back to assets reliably —
 * those are treated as "no saved look" so the editor opens on defaults rather
 * than rendering someone else's clothes.
 */
export function normaliseConfig(raw: any): AvatarConfig | null {
  if (!raw || typeof raw !== 'object') return null;

  const base = getBaseById(raw.base);
  if (!base) return null;

  const parts: AvatarConfig['parts'] = {};
  for (const slot of AVATAR_SLOTS) {
    const value = raw.parts?.[slot];
    parts[slot] = typeof value === 'string' && getAssetById(slot, value) ? value : null;
  }

  const hairColor = typeof raw.hairColor === 'string' ? raw.hairColor : null;

  return { version: REGISTRY_VERSION, base: base.id, parts, hairColor };
}

/** True when the config still resolves to a drawable avatar. */
export function isRenderable(config?: AvatarConfig | null): boolean {
  return resolveConfig(config).length > 0;
}

/** Slots the wardrobe lists, including the two that are not part artwork. */
export type UsedAssetSlot = 'base' | AvatarSlot | 'hairColor';

/** One row of the "used assets" breakdown for a saved look. */
export interface UsedAsset {
  slot: UsedAssetSlot;
  label: string;
  /** The stored id, kept even when it no longer resolves, so the UI can say so. */
  assetId: string | null;
  /** Bundled artwork, or null when there is nothing to draw. */
  source: number | null;
  /** Hex tint. Only ever set on the `hairColor` row. */
  color?: string | null;
  /**
   * `ok` — resolved. `retired` — the config names an id the registry no longer
   * has, so the layer was dropped rather than swapped for different art.
   * `none` — the slot was deliberately left empty.
   */
  status: 'ok' | 'retired' | 'none';
}

const SLOT_LABELS: Record<UsedAssetSlot, string> = {
  base: 'Base',
  bodyColor: 'Skin tone',
  hair: 'Hair',
  hairColor: 'Hair colour',
  outfit: 'Outfit',
  skirt: 'Skirt',
  shoes: 'Shoes',
};

/** The order the wardrobe reads best in — identity first, then top down. */
const USED_ASSET_ORDER: UsedAssetSlot[] = [
  'base',
  'hair',
  'hairColor',
  'outfit',
  'skirt',
  'shoes',
  'bodyColor',
];

/**
 * A display name for an asset id.
 *
 * Ids are artwork file stems, so this is a presentation stopgap until the
 * backend catalogue supplies a real `displayName` per asset.
 */
export function humaniseAssetId(assetId: string): string {
  const spaced = assetId
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * What a saved look is actually built from.
 *
 * Driven entirely by the stored config and resolved through the registry by
 * stable id, so it lists exactly the parts this avatar uses — never the full
 * catalogue, and never whatever a picker happens to be showing.
 */
export function describeUsedAssets(config?: AvatarConfig | null): UsedAsset[] {
  const base = getBaseById(config?.base);
  if (!config || !base) return [];

  return USED_ASSET_ORDER.map((slot): UsedAsset => {
    if (slot === 'base') {
      return {
        slot,
        label: SLOT_LABELS.base,
        assetId: base.id,
        source: base.source,
        status: 'ok',
      };
    }

    if (slot === 'hairColor') {
      const color = config.hairColor ?? null;
      return {
        slot,
        label: SLOT_LABELS.hairColor,
        assetId: color,
        source: null,
        color,
        // No tint is a real choice - the artwork's own colour - not a gap.
        status: color ? 'ok' : 'none',
      };
    }

    const assetId = config.parts?.[slot] ?? null;
    if (!assetId) {
      return { slot, label: SLOT_LABELS[slot], assetId: null, source: null, status: 'none' };
    }

    const asset = getAssetById(slot, assetId);
    return {
      slot,
      label: SLOT_LABELS[slot],
      assetId,
      source: asset?.source ?? null,
      status: asset ? 'ok' : 'retired',
    };
  });
}

export function baseOf(config?: AvatarConfig | null): AvatarBase | undefined {
  return getBaseById(config?.base);
}

/** Immutably sets one slot, used by every picker in the editor. */
export function withPart(
  config: AvatarConfig,
  slot: AvatarSlot,
  assetId: string | null,
): AvatarConfig {
  return { ...config, parts: { ...config.parts, [slot]: assetId } };
}

export function withHairColor(config: AvatarConfig, hairColor: string | null): AvatarConfig {
  return { ...config, hairColor };
}
