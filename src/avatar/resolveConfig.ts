import { ArtworkCatalogue, sourceForAsset, sourceForBase } from './assetSource';
import { getAssetById, getBaseById, listFor, REGISTRY_VERSION } from './registry';
import { resolveBaseById } from './baseCatalogue';
import { AssetSource, AVATAR_SLOTS, AvatarBase, AvatarConfig, AvatarLayer, AvatarSlot } from './types';

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
 *
 * `catalogue` is optional on purpose. Omitting it resolves purely from the
 * bundle, which is both the offline path and what keeps this function pure
 * enough to unit test — passing one only changes *where* each layer's artwork
 * is fetched from, never which layers a look has.
 */
export function resolveConfig(
  config?: AvatarConfig | null,
  catalogue?: ArtworkCatalogue,
): AvatarLayer[] {
  // Looked up through the catalogue as well as the bundle: a base added in the
  // dashboard exists nowhere else, and resolving only from the bundle would
  // render every avatar built on one as nothing at all.
  const base = resolveBaseById(config?.base, catalogue);
  if (!config || !base) return [];

  const layers: AvatarLayer[] = [
    { slot: 'base', assetId: base.id, source: sourceForBase(base.id, catalogue) ?? base.source },
  ];

  for (const slot of AVATAR_SLOTS) {
    const assetId = config.parts?.[slot];
    if (!assetId) continue;

    const source = sourceForAsset(slot, assetId, catalogue);
    // No artwork anywhere: the part was removed, renamed, or is listed with
    // nothing uploaded yet. Skip the layer rather than draw a broken image.
    if (!source) continue;

    layers.push({
      slot,
      assetId,
      source,
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
export function normaliseConfig(
  raw: any,
  catalogue?: ArtworkCatalogue,
): AvatarConfig | null {
  if (!raw || typeof raw !== 'object') return null;

  // Without a catalogue this still accepts every bundled base, so existing
  // callers are unchanged; passing one additionally keeps a look built on a
  // dashboard base from being discarded as unrecognised.
  const base = resolveBaseById(raw.base, catalogue);
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
export function isRenderable(
  config?: AvatarConfig | null,
  catalogue?: ArtworkCatalogue,
): boolean {
  return resolveConfig(config, catalogue).length > 0;
}

/** Slots the wardrobe lists, including the two that are not part artwork. */
export type UsedAssetSlot = 'base' | AvatarSlot | 'hairColor';

/** One row of the "used assets" breakdown for a saved look. */
export interface UsedAsset {
  slot: UsedAssetSlot;
  label: string;
  /** The stored id, kept even when it no longer resolves, so the UI can say so. */
  assetId: string | null;
  /** Resolved artwork, bundled or remote, or null when there is nothing to draw. */
  source: AssetSource | null;
  /** Hex tint. Only ever set on the `hairColor` row. */
  color?: string | null;
  /**
   * `ok` — resolved. `retired` — the config names an id nothing knows about, so
   * the layer was dropped rather than swapped for different art. `unavailable`
   * — the catalogue lists the part but no artwork has been uploaded and none
   * ships in the bundle, which is a gap to fix rather than a retirement.
   * `none` — the slot was deliberately left empty.
   */
  status: 'ok' | 'retired' | 'unavailable' | 'none';
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
 * Driven entirely by the stored config and resolved by stable id, so it lists
 * exactly the parts this avatar uses — never the full catalogue, and never
 * whatever a picker happens to be showing.
 *
 * As with `resolveConfig`, `catalogue` only redirects where artwork is fetched
 * from; the rows themselves come from the saved config either way.
 */
export function describeUsedAssets(
  config?: AvatarConfig | null,
  catalogue?: ArtworkCatalogue,
): UsedAsset[] {
  const base = resolveBaseById(config?.base, catalogue);
  if (!config || !base) return [];

  return USED_ASSET_ORDER.map((slot): UsedAsset => {
    if (slot === 'base') {
      return {
        slot,
        label: SLOT_LABELS.base,
        assetId: base.id,
        source: sourceForBase(base.id, catalogue) ?? base.source,
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

    const source = sourceForAsset(slot, assetId, catalogue);
    // A part the catalogue knows but cannot draw is a missing upload, not a
    // retirement — worth telling apart so the wardrobe can say which it is.
    const isListed = Boolean(catalogue?.[assetId]);

    return {
      slot,
      label: SLOT_LABELS[slot],
      assetId,
      source,
      status: source ? 'ok' : isListed ? 'unavailable' : 'retired',
    };
  });
}

export function baseOf(
  config?: AvatarConfig | null,
  catalogue?: ArtworkCatalogue,
): AvatarBase | undefined {
  return resolveBaseById(config?.base, catalogue);
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
