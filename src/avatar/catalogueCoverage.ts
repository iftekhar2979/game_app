import { ArtworkCatalogue } from './assetSource';
import { ASSETS, BASES } from './registry';
import { AVATAR_SLOTS } from './types';

/**
 * Does the backend catalogue actually cover the artwork this app ships?
 *
 * The two lists are maintained in different repositories — `registry.ts` here
 * and `BUNDLED_AVATAR_ASSETS` on the server — and nothing mechanical keeps them
 * in step. They agree today because both were generated from the same source,
 * which is exactly the kind of agreement that quietly stops being true.
 *
 * Drift is silent in the worst way: an asset the registry has and the catalogue
 * does not resolves to `unknown`, which makes it **unselectable**, and the
 * picker shows it dimmed with no explanation. That reads as a rendering bug and
 * gets debugged in the app, when the fix is one seed row on the server.
 *
 * So it is reported rather than left to be discovered. Pure and free of React
 * Native imports so it can be tested directly.
 */

export interface CatalogueCoverage {
  /**
   * Bundled ids with no catalogue row.
   *
   * These draw correctly and cannot be chosen. Fix by seeding them.
   */
  missing: string[];
  /**
   * Catalogue keys that nothing can draw — no uploaded artwork, and no bundled
   * art under that id. Selectable in principle, invisible in practice.
   */
  undrawable: string[];
  /**
   * Catalogue keys the app can draw but can never put in front of anyone.
   *
   * Now that the pickers merge the catalogue in, an uploaded asset normally
   * appears on its own. One that cannot is a data problem, not a code one - a
   * slot the app has no picker for, a missing target, or no categories, so
   * nothing it could ever be matched against. Silent otherwise: the asset
   * exists, is active, has artwork, and simply never shows up.
   */
  unlistable: string[];
  /** True when every bundled id is listed and every listed key is usable. */
  isComplete: boolean;
}

/** Every stable id the app ships artwork for, bases included. */
export function bundledAssetIds(): string[] {
  return [
    ...BASES.map((base) => base.id),
    ...AVATAR_SLOTS.flatMap((slot) => (ASSETS[slot] ?? []).map((asset) => asset.id)),
  ];
}

/**
 * Compares the shipped registry against a catalogue lookup.
 *
 * An empty catalogue reports no problems at all: "not loaded yet" and "loaded
 * and missing everything" are indistinguishable here, and warning on every cold
 * start would train people to ignore the warning that matters.
 */
export function describeCatalogueCoverage(catalogue?: ArtworkCatalogue): CatalogueCoverage {
  const empty = { missing: [], undrawable: [], unlistable: [], isComplete: true };
  if (!catalogue || Object.keys(catalogue).length === 0) return empty;

  const bundled = new Set(bundledAssetIds());
  const listableSlots = new Set<string>([...AVATAR_SLOTS, 'base']);

  const missing = [...bundled].filter((id) => !catalogue[id]).sort();
  const undrawable = Object.keys(catalogue)
    .filter((key) => !bundled.has(key) && !catalogue[key]?.imageUrl)
    .sort();

  const unlistable = Object.entries(catalogue)
    .filter(([key, row]) => {
      const asset = row as any;
      // Only rows that could otherwise be shown: drawable, and not already
      // reported as artwork-less above.
      if (!asset?.imageUrl && !bundled.has(key)) return false;
      if (asset?.isRetired) return false;

      // Only a row that describes itself can be judged. A lookup carrying just
      // artwork - which is all `ArtworkCatalogue` promises - is not evidence of
      // a misfiled asset, and treating it as such would flag the whole
      // catalogue every time this ran against one.
      if (asset?.slot === undefined) return false;

      return (
        !listableSlots.has(asset.slot) ||
        !asset.target ||
        !(asset.categories?.length > 0)
      );
    })
    .map(([key]) => key)
    .sort();

  return {
    missing,
    undrawable,
    unlistable,
    isComplete:
      missing.length === 0 && undrawable.length === 0 && unlistable.length === 0,
  };
}

/** One human-readable line per problem, or `null` when there is nothing to say. */
export function formatCoverageWarning(coverage: CatalogueCoverage): string | null {
  if (coverage.isComplete) return null;

  const lines: string[] = [];

  if (coverage.missing.length) {
    lines.push(
      `${coverage.missing.length} bundled asset(s) have no catalogue row and cannot be selected: ` +
        `${coverage.missing.join(', ')}. Seed them on the server.`,
    );
  }

  if (coverage.undrawable.length) {
    lines.push(
      `${coverage.undrawable.length} catalogue asset(s) have no artwork anywhere: ` +
        `${coverage.undrawable.join(', ')}. Upload artwork or retire them.`,
    );
  }

  if (coverage.unlistable.length) {
    lines.push(
      `${coverage.unlistable.length} catalogue asset(s) can never be shown: ` +
        `${coverage.unlistable.join(', ')}. Check their slot, target and ` +
        `categories - the app has no picker that would match them.`,
    );
  }

  return lines.join('\n');
}
