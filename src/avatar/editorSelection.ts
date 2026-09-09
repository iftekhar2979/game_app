import { AvatarAsset, AvatarConfig, AvatarSlot } from './types';

export type EditorPartChoices = Partial<Record<AvatarSlot, string | null>>;

/** The stable part keys advertised on one character's Explore card. */
export function previewPartsOf(
  layers?: ReadonlyArray<{ slot: AvatarSlot; key: string }> | null,
): Partial<Record<AvatarSlot, string>> {
  const parts: Partial<Record<AvatarSlot, string>> = {};

  for (const layer of layers ?? []) {
    parts[layer.slot] = layer.key;
  }

  return parts;
}

interface ResolveEditorPartOptions {
  slot: AvatarSlot;
  choices: EditorPartChoices;
  savedConfig?: AvatarConfig | null;
  previewParts: Partial<Record<AvatarSlot, string>>;
  options: readonly AvatarAsset[];
  canValidate: boolean;
  fallbackToFirst: boolean;
}

/**
 * Resolves one picker selection without storing asynchronous defaults in state.
 *
 * Before the scoped wardrobe arrives, a saved look or the Explore-card preview
 * is safe to draw by stable key. Afterwards the key is confirmed against this
 * character's wardrobe. Explicit user choices always win, including `null` for
 * a deliberate "None" selection.
 */
export function resolveEditorPart({
  slot,
  choices,
  savedConfig,
  previewParts,
  options,
  canValidate,
  fallbackToFirst,
}: ResolveEditorPartOptions): string | null {
  if (Object.prototype.hasOwnProperty.call(choices, slot)) {
    return choices[slot] ?? null;
  }

  const requested = savedConfig
    ? savedConfig.parts?.[slot] ?? null
    : previewParts[slot] ?? null;

  if (!canValidate) return requested;
  if (requested && options.some(asset => asset.id === requested))
    return requested;

  // Never silently redress a saved avatar whose old part is no longer offered.
  if (savedConfig) return null;
  return fallbackToFirst && options.length ? options[0].id : null;
}
