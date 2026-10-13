import { REGISTRY_VERSION } from './registry';
import { AvatarConfig } from './types';

/**
 * The character an account starts with, so nobody is drawn as their initials.
 *
 * The server gives every new account one of these and backfills older ones
 * (`default-avatar-configs.ts` there; change both together). This copy covers
 * an account the backfill has not reached, or a server that predates it.
 * Every part is free bundled artwork, so it draws offline too.
 */
const FEMALE_DEFAULT: AvatarConfig = {
  version: REGISTRY_VERSION,
  base: 'base_avatar_3',
  parts: {
    bodyColor: null,
    skirt: 'short_pant_1',
    shoes: 'green_shoe_1',
    outfit: 'half_sleve_blouse_1',
    hair: 'hair2',
  },
  hairColor: null,
};

const MALE_DEFAULT: AvatarConfig = {
  version: REGISTRY_VERSION,
  base: 'male_avatar_1',
  // The male bodies have shoes painted on.
  parts: {
    bodyColor: null,
    skirt: 'black_short_pant_1_1',
    shoes: null,
    outfit: 'blue_shirt_1_1',
    hair: 'black_hair_1_1',
  },
  hairColor: null,
};

/** Female gets the female character; male, other and unset get the male one, as on the server. */
export function defaultAvatarConfigFor(gender?: string | null): AvatarConfig {
  return String(gender ?? '').toLowerCase() === 'female' ? FEMALE_DEFAULT : MALE_DEFAULT;
}
