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
