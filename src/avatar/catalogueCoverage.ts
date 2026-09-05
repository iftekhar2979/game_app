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
  /** True when every bundled id is listed and every listed key is drawable. */
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
  const empty = { missing: [], undrawable: [], isComplete: true };
  if (!catalogue || Object.keys(catalogue).length === 0) return empty;

  const bundled = new Set(bundledAssetIds());

  const missing = [...bundled].filter((id) => !catalogue[id]).sort();
  const undrawable = Object.keys(catalogue)
    .filter((key) => !bundled.has(key) && !catalogue[key]?.imageUrl)
    .sort();

  return {
    missing,
    undrawable,
    isComplete: missing.length === 0 && undrawable.length === 0,
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

  return lines.join('\n');
}
