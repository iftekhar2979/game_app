/**
 * Pure helpers for the favourite gym and team.
 *
 * Kept out of the endpoint definitions so they can be tested directly, matching
 * `avatarAssetsTransforms.ts`. RTK Query does not expose an endpoint's `query`
 * or `transformResponse` at runtime, so anything defined inline there is only
 * reachable through a live store - and these two rules are worth asserting on
 * their own.
 */

/** One organization as a profile card shows it. */
export interface OrganizationSummary {
  id: string;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  location?: string | null;
}

/**
 * Which favourite is being set. Also the field name on the wire.
 *
 * A gym and a team are both organizations, so one list and one picker answer
 * both - which makes this the *only* thing separating them. Passing it around
 * explicitly is what stops a picker writing the wrong one, a mistake that would
 * be invisible on screen because the two lists are identical.
 */
export type FavoriteField = 'favoriteOrganizationId' | 'favoriteTeamId';

/**
 * Query parameters for the organization list.
 *
 * Searched and capped server-side. The full list is unbounded and this runs on
 * a phone: fetching it whole to filter locally is the shape that works in
 * development and falls over once the data is real.
 */
export function organizationQueryParams(args?: {
  search?: string;
  limit?: number;
}): { search?: string; limit: number } {
  const search = args?.search?.trim();

  return {
    // Absent rather than empty: an empty term must mean "the first page", not
    // "match the empty string".
    search: search ? search : undefined,
    limit: args?.limit ?? 30,
  };
}

/** Reshapes the API's organizations into what a card renders, and no more. */
export function toOrganizationSummaries(response: any): OrganizationSummary[] {
  const rows = response?.data ?? response ?? [];
  if (!Array.isArray(rows)) return [];

  return rows.map((org: any) => ({
    id: org._id ?? org.id,
    name: org.name,
    shortName: org.shortName ?? null,
    logoUrl: org.logoUrl ?? null,
    location: org.location ?? null,
  }));
}

/**
 * The patch body that sets one favourite.
 *
 * Exactly one field, so setting a gym cannot blank a team - which is what
 * sending both on every save would do. `null` is included rather than omitted,
 * because omitting a field leaves it alone: an omission could never un-set a
 * favourite.
 */
export function favoriteUpdate(
  field: FavoriteField,
  id: string | null,
): Record<string, string | null> {
  return { [field]: id };
}
