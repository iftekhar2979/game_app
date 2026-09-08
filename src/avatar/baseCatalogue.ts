import type {
  AvatarCatalogueAsset,
  AvatarCharacter,
} from '../store/api/avatarAssetsTransforms';
import { getBaseById } from './registry';
import { AssetSource, AvatarBase, AvatarTarget } from './types';

/**
 * The base bodies a player may build on.
 *
 * The catalogue is the source. The bundle used to be merged in as a fallback
 * list of five bodies, which meant a body could exist in the picker that the
 * server had never heard of - and therefore one with no wardrobe the server
 * could scope, whose garments had to be guessed at locally by category number.
 * That guess is the leak, so the merge is gone and the bundle now only answers
 * "what does this key draw as".
 *
 * The trade is deliberate: with no network there are no bodies to choose from,
 * where previously there were five that could be dressed wrongly. A body the
 * server cannot describe is a body whose wardrobe cannot be trusted.
 */

/**
 * Catalogue rows keyed by asset key, as `useAssetCatalogue` holds them.
 *
 * Deliberately permissive: `ArtworkCatalogue` and this are the same object at
 * runtime - the hook hands the one lookup to both - and every reader here
 * guards on the fields it needs, so accepting a looser row is honest rather
 * than a cast that claims more than is known.
 */
export type CatalogueAssets = Record<string, Partial<AvatarCatalogueAsset> | undefined>;

/**
 * Turns one catalogue row into a renderable body.
 *
 * Returns null when nothing could draw it: no uploaded artwork and no bundled
 * file under that key. Listing a base with no artwork would put an invisible
 * body in the picker, which reads as a broken app rather than a missing upload.
 */
export function toBase(
  asset: Partial<AvatarCatalogueAsset>,
  characterId?: string,
): AvatarBase | null {
  const character = asset.characterId ?? characterId;
  if (!asset.key || !asset.target || !character) return null;

  const bundled = getBaseById(asset.key);
  const source = asset.imageUrl ? { uri: asset.imageUrl } : bundled?.source;
  if (!source) return null;

  return {
    id: asset.key,
    target: asset.target as AvatarTarget,
    characterId: character,
    isFullbody: asset.isFullbody ?? bundled?.isFullbody ?? true,
    source,
    bodyColorId: asset.bodyColorId ?? null,
    blinkEnabled: asset.blinkEnabled ?? true,
    // Absent leaves these null, and the renderer falls back to the bundled
    // overlays - which is what every body that shipped with the app uses.
    normalEyeSource: asset.normalEyeUrl ? { uri: asset.normalEyeUrl } : null,
    blinkEyeSource: asset.blinkEyeUrl ? { uri: asset.blinkEyeUrl } : null,
  };
}

/** Every tone of one character, in catalogue order. */
export function tonesOf(character: AvatarCharacter): AvatarBase[] {
  return character.variants
    .map((variant) => toBase(variant, character.characterId))
    .filter((base): base is AvatarBase => base !== null);
}

/** Every body across every character, for the picker. */
export function resolveBases(characters?: AvatarCharacter[] | null): AvatarBase[] {
  return (characters ?? []).flatMap(tonesOf);
}

/**
 * One base by id, from an artwork lookup rather than from the character list.
 *
 * This is the *render* path: the feed, the wardrobe and the profile resolve a
 * saved avatar's body without ever loading a character list, and they must keep
 * doing so. It therefore takes the same by-key record every other resolver
 * takes, and falls back to the bundle.
 *
 * Deliberately indifferent to retirement and to assignment. Withdrawing a body
 * stops it being chosen; it does not un-draw the avatars already built on it,
 * and a look saved months ago must render the same today.
 */
export function resolveBaseById(
  id?: string | null,
  assets?: CatalogueAssets | null,
): AvatarBase | undefined {
  if (!id) return undefined;

  const row = assets?.[id];
  if (row && row.slot === 'base') {
    const base = toBase({ key: id, ...row });
    if (base) return base;
  }

  const bundled = getBaseById(id);
  if (!bundled) return undefined;

  // A bundled body the catalogue cannot describe still draws, under its own key
  // as its own character - which is what it was before anyone grouped it.
  return { ...bundled, characterId: bundled.characterId ?? id };
}

/**
 * The character a base belongs to, which is what scopes its wardrobe.
 *
 * Answered from the character list where there is one, because that is the
 * authority; the bundle's own grouping is the fallback for a body the server
 * could not describe.
 */
export function characterIdOf(
  baseId?: string | null,
  characters?: AvatarCharacter[] | null,
): string | null {
  if (!baseId) return null;

  for (const character of characters ?? []) {
    if (character.variants.some((variant) => variant.key === baseId)) {
      return character.characterId;
    }
  }

  return getBaseById(baseId)?.characterId ?? null;
}

/** The tones of whichever character this body belongs to. */
export function tonesForBase(
  baseId?: string | null,
  characters?: AvatarCharacter[] | null,
): AvatarBase[] {
  const characterId = characterIdOf(baseId, characters);
  if (!characterId) return [];

  const character = (characters ?? []).find(
    (candidate) => candidate.characterId === characterId,
  );

  return character ? tonesOf(character) : [];
}

/** The phases of a blink, as the renderers step through them. */
export type EyeState = 'open' | 'half_closed' | 'closed';

/**
 * How far closed the eye overlay is drawn in each phase.
 *
 * A catalogue base supplies one closed frame, but the blink has two closed
 * phases - the bundled bodies ship separate half and full artwork for them.
 * Fading the one frame stands in for the missing half: a mid-blink is roughly a
 * partly drawn closed eye, and it reads as a blink rather than the on/off
 * flicker a single opacity gives.
 */
export const HALF_CLOSED_OPACITY = 0.55;

export function blinkOpacity(state: EyeState): number {
  if (state === 'closed') return 1;
  if (state === 'half_closed') return HALF_CLOSED_OPACITY;
  return 0;
}

/**
 * The eye overlays to blink with, catalogue first.
 *
 * Returns null when the body does not blink at all, which is a real choice an
 * admin can make rather than a missing asset.
 *
 * `normal` is the open eye, and is genuinely optional: it exists for a body
 * drawn without eyes of its own. Every bundled body has them painted into its
 * artwork, which is why there is no bundled counterpart to fall back to.
 */
export function blinkSourcesFor(
  base: Pick<AvatarBase, 'blinkEnabled' | 'normalEyeSource' | 'blinkEyeSource'>,
): { normal: AssetSource | null; blink: AssetSource | null } | null {
  if (base.blinkEnabled === false) return null;

  return {
    normal: base.normalEyeSource ?? null,
    blink: base.blinkEyeSource ?? null,
  };
}

/** A short label for one tone, for the editor's variant row. */
export function describeVariant(base: AvatarBase, index: number): string {
  if (!base.bodyColorId) return `Tone ${index + 1}`;

  // `light_brown` reads better as "Light brown" than as the stored id.
  return base.bodyColorId
    .split('_')
    .filter(Boolean)
    .join(' ')
    .replace(/^./, (first) => first.toUpperCase());
}
