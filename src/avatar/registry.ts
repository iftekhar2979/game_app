import { AvatarAsset, AvatarBase, AvatarSlot, AvatarTarget } from './types';

/**
 * The single source of truth for avatar artwork.
 *
 * Previously these lists were duplicated verbatim between `ExploreAvatarScreen`
 * and `GenerateAvatarScreen` (and the hair/outfit lists were duplicated *again*
 * within the latter as separate half-body and full-body copies). Adding a part
 * meant editing four arrays.
 *
 * Every asset id is the artwork's file stem, so an id is traceable to a file and
 * stays stable as lists grow or get reordered. **Never reuse an id for different
 * art** — saved avatars reference these ids.
 */

/** Bump when the config shape changes in a way that needs migration. */
export const REGISTRY_VERSION = 1;

/** Hair tints offered in the editor. */
export const HAIR_COLORS = ['#E6C27A', '#8D5B36', '#4A2F1D', '#1A1A1A', '#A33327', '#E6E6E6'];

/**
 * Sizes a full-body character inside its stage.
 *
 * Shared so the editor preview and the wardrobe frame the same avatar the same
 * way. It has to be composed into whatever animated `transform` a stage sets,
 * because an inline transform replaces a style's transform array rather than
 * merging with it — the bug that silently dropped this scale between 980cf12
 * and 56c48c1.
 */
export const FULLBODY_STAGE_SCALE = 1.15;

export const BASES: AvatarBase[] = [
  { id: 'base_avatar_3', target: 'female', characterId: 'base_avatar_3', isFullbody: true, source: require('../assets/images/avatar/base/base_avatar_3.png') },
  { id: 'base_avatar_4', target: 'female', characterId: 'base_avatar_4', isFullbody: true, source: require('../assets/images/avatar/base/base_avatar_4.png') },
  { id: 'base_avatar_5', target: 'female', characterId: 'base_avatar_5', isFullbody: true, source: require('../assets/images/avatar/base/base_avatar_5.png') },
  { id: 'male_avatar_1', target: 'male', characterId: 'male_avatar_1', isFullbody: true, source: require('../assets/images/avatar/base/male_avatar_1.png') },
  { id: 'male_avatar_2', target: 'male', characterId: 'male_avatar_2', isFullbody: true, source: require('../assets/images/avatar/base/male_avatar_2.png') },
];

const HAIR: AvatarAsset[] = [
  { id: 'hair2', target: 'female', source: require('../assets/images/avatar/hair/Hair2.png') },
  { id: 'hair6', target: 'female', source: require('../assets/images/avatar/hair/Hair6.png') },
  { id: 'black_hair_1_1', target: 'male', source: require('../assets/images/avatar/male/hair/black_hair_1_1.png') },
  { id: 'black_hair_1_2', target: 'male', source: require('../assets/images/avatar/male/hair/black_hair_1_2.png') },
  { id: 'black_hair_1_5', target: 'male', source: require('../assets/images/avatar/male/hair/black_hair_1_5.png') },
  { id: 'hair_1_3', target: 'male', source: require('../assets/images/avatar/male/hair/hair_1_3.png') },
  { id: 'hair_2_1', target: 'male', source: require('../assets/images/avatar/male/hair/hair_2_1.png') },
  { id: 'black_hair_2_3', target: 'male', source: require('../assets/images/avatar/male/hair/black_hair_2_3.png') },
  { id: 'black_hair_2_4', target: 'male', source: require('../assets/images/avatar/male/hair/black_hair_2_4.png') },
  { id: 'black_hair_2_5', target: 'male', source: require('../assets/images/avatar/male/hair/black_hair_2_5.png') },
  { id: 'red_hair_2_1', target: 'male', source: require('../assets/images/avatar/male/hair/red_hair_2_1.png') },
  { id: 'white_hair_2_2', target: 'male', source: require('../assets/images/avatar/male/hair/white_hair_2_2.png') },
];

const OUTFITS: AvatarAsset[] = [
  { id: 'suit1', target: 'female', source: require('../assets/images/avatar/fullbody/upperbody/suit1.png') },
  { id: 'half_sleve_blouse_1', target: 'female', source: require('../assets/images/avatar/fullbody/upperbody/half_sleve_blouse_1.png') },
  { id: 'full_sleve_1', target: 'female', source: require('../assets/images/avatar/fullbody/upperbody/full_sleve_1.png') },
  { id: 'necksleb_1', target: 'female', source: require('../assets/images/avatar/fullbody/upperbody/necksleb_1.png') },
  { id: 'neckless_sleve_2', target: 'female', source: require('../assets/images/avatar/fullbody/upperbody/neckless_sleve_2.png') },
  { id: 'blue_shirt_1_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/blue_shirt_1_1.png') },
  { id: 'blue_shirt_1_2', target: 'male', source: require('../assets/images/avatar/male/upperbody/blue_shirt_1_2.png') },
  { id: 'green_shirt_1_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/green_shirt_1_1.png') },
  { id: 'red_shirt_1_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/red_shirt_1_1.png') },
  { id: 'black_shirt_2_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/black_shirt_2_1.png') },
  { id: 'black_undershirt_2_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/black_undershirt_2_1.png') },
  { id: 'blue_shirt_2_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/blue_shirt_2_1.png') },
  { id: 'blue_undershirt_2_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/blue_undershirt_2_1.png') },
  { id: 'green_shirt_2_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/green_shirt_2_1.png') },
  { id: 'green_undershirt_2_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/green_undershirt_2_1.png') },
  { id: 'red_undershirt_2_1', target: 'male', source: require('../assets/images/avatar/male/upperbody/red_undershirt_2_1.png') },
];

const SKIRTS: AvatarAsset[] = [
  { id: 'full_pant_33', target: 'female', source: require('../assets/images/avatar/fullbody/skirt/full_pant_33.png') },
  { id: 'short_pant_1', target: 'female', source: require('../assets/images/avatar/fullbody/skirt/short_pant_1.png') },
  { id: 'short_pant_2', target: 'female', source: require('../assets/images/avatar/fullbody/skirt/short_pant_2.png') },
  { id: 'short_pant_3', target: 'female', source: require('../assets/images/avatar/fullbody/skirt/short_pant_3.png') },
  { id: 'black_short_pant_1_1', target: 'male', source: require('../assets/images/avatar/male/pants/black_short_pant_1_1.png') },
  { id: 'blue_short_pant_1_1', target: 'male', source: require('../assets/images/avatar/male/pants/blue_short_pant_1_1.png') },
  { id: 'green_short_pant_1_1', target: 'male', source: require('../assets/images/avatar/male/pants/green_short_pant_1_1.png') },
  { id: 'green_pant_1_1', target: 'male', source: require('../assets/images/avatar/male/pants/green_pant_1_1.png') },
  { id: 'red_short_pant_1_1', target: 'male', source: require('../assets/images/avatar/male/pants/red_short_pant_1_1.png') },
  { id: 'green_short_pant_2', target: 'male', source: require('../assets/images/avatar/male/pants/green_short_pant_2.png') },
  { id: 'blue_short_pant_2_1', target: 'male', source: require('../assets/images/avatar/male/pants/blue_short_pant_2_1.png') },
  { id: 'red_short_pant_2_1', target: 'male', source: require('../assets/images/avatar/male/pants/red_short_pant_2_1.png') },
];

const SHOES: AvatarAsset[] = [
  { id: 'green_shoe_1', target: 'female', source: require('../assets/images/avatar/fullbody/shoes/green_shoe_1.png') },
  { id: 'green_shoe_14', target: 'female', source: require('../assets/images/avatar/fullbody/shoes/green_shoe_14.png') },
  { id: 'green_shoes_41', target: 'female', source: require('../assets/images/avatar/fullbody/shoes/green_shoes_41.png') },
  { id: 'shoe_1', target: 'female', source: require('../assets/images/avatar/fullbody/shoes/shoe_1.png') },
];

const BODY_COLORS: AvatarAsset[] = [
  { id: 'brown_yellow', target: 'male', source: require('../assets/images/avatar/fullbody/body_color/brown_yellow.png') },
];

/** Every selectable slot, keyed for lookup. Paint order lives in `AVATAR_SLOTS`. */
export const ASSETS: Record<AvatarSlot, AvatarAsset[]> = {
  bodyColor: BODY_COLORS,
  skirt: SKIRTS,
  shoes: SHOES,
  outfit: OUTFITS,
  hair: HAIR,
};

/** Blink overlays, chosen by base rather than picked by the user. */
const EYES = {
  half: {
    male_1: require('../assets/images/avatar/utils/half_closed_eye_male_1.png'),
    male_2: require('../assets/images/avatar/utils/half_closed_eye_male_2.png'),
    female_all: require('../assets/images/avatar/utils/half_closed_eye_female_all.png'),
  },
  full: {
    male_1: require('../assets/images/avatar/utils/full_closed_eye_male_1.png'),
    male_2: require('../assets/images/avatar/utils/full_closed_eye_male_2.png'),
    female_all: require('../assets/images/avatar/utils/full_closed_eye_female_all.png'),
  },
};

/**
 * The bundled blink overlay for a body.
 *
 * Chosen by the base's own id rather than by a category number. The two male
 * bodies that ship with the app have separate eye artwork, and picking between
 * them by category meant any male body whose number was not 1 or 2 fell through
 * to the female overlay - which was every male base created after a category
 * stopped being something an admin typed.
 *
 * Only ever a fallback: a catalogue body supplies its own overlays through
 * `normalEyeUrl` / `blinkEyeUrl`, and this answers for the five bundled bodies
 * that have their eyes painted into the artwork instead.
 */
export function getEyeSource(
  state: 'half' | 'full',
  target: AvatarTarget,
  baseId?: string | null,
): number {
  if (target === 'male') {
    return baseId === 'male_avatar_2' ? EYES[state].male_2 : EYES[state].male_1;
  }

  return EYES[state].female_all;
}

export function getBaseById(id?: string | null): AvatarBase | undefined {
  return BASES.find((base) => base.id === id);
}

export function getAssetById(slot: AvatarSlot, id?: string | null): AvatarAsset | undefined {
  if (!id) return undefined;
  return ASSETS[slot]?.find((asset) => asset.id === id);
}

/**
 * Bundled artwork is addressed by id alone.
 *
 * `listFor` and `indexOfAsset` used to live here. Both took a target and a
 * category and answered "which parts fit this body", which made the bundle a
 * source of compatibility as well as of pixels - and a wrong one, since two
 * unrelated bodies could carry the same number. Compatibility now comes from
 * the server's `AvatarAssetAssignment` rows and reaches the editor through
 * `resolveParts`, so there is nothing left for a category to decide.
 *
 * `indexOfAsset` also went because the editor no longer holds indices: a
 * selection is a stable asset key, which is what it persists anyway.
 */
