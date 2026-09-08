import {
  bundledAssetIds,
  describeCatalogueCoverage,
  formatCoverageWarning,
} from '../src/avatar/catalogueCoverage';
import { ArtworkCatalogue } from '../src/avatar/assetSource';

/**
 * Guards the seam between two repositories.
 *
 * The app's registry and the server's `BUNDLED_AVATAR_ASSETS` are separate
 * files with no mechanical link, and an asset present in one but not the other
 * fails silently — it draws, and simply cannot be picked. These tests pin the
 * detection, since the drift itself can only be caught at runtime.
 */

/** Every bundled id listed, which is what a correctly seeded catalogue looks like. */
const fullCatalogue = (): ArtworkCatalogue =>
  Object.fromEntries(bundledAssetIds().map((id) => [id, { imageUrl: null }]));

describe('bundled asset inventory', () => {
  it('covers every base and every part slot', () => {
    const ids = bundledAssetIds();

    expect(ids).toContain('base_avatar_3');
    expect(ids).toContain('male_avatar_1');
    expect(ids).toContain('hair6');
    expect(ids).toContain('suit1');
    expect(ids).toContain('shoe_1');
    expect(ids).toContain('brown_yellow');
  });

  it('lists each id exactly once', () => {
    const ids = bundledAssetIds();

    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * Pins the count the server seed was generated against. A change here is
   * legitimate — artwork gets added — but it must be matched by a seed row, so
   * the number is worth having to update deliberately.
   */
  it('ships the 50 assets the server catalogue was seeded from', () => {
    expect(bundledAssetIds()).toHaveLength(50);
  });
});

describe('coverage against a catalogue', () => {
  it('reports nothing for a fully seeded catalogue', () => {
    const coverage = describeCatalogueCoverage(fullCatalogue());

    expect(coverage.isComplete).toBe(true);
    expect(formatCoverageWarning(coverage)).toBeNull();
  });

  it('stays quiet before the catalogue has loaded', () => {
    expect(describeCatalogueCoverage(undefined).isComplete).toBe(true);
    expect(describeCatalogueCoverage({}).isComplete).toBe(true);
  });

  it('names a bundled asset the catalogue never listed', () => {
    const partial = fullCatalogue();
    delete partial.hair6;

    const coverage = describeCatalogueCoverage(partial);

    expect(coverage.missing).toEqual(['hair6']);
    expect(formatCoverageWarning(coverage)).toContain('hair6');
    expect(formatCoverageWarning(coverage)).toContain('Seed them');
  });

  it('names a catalogue asset nothing can draw', () => {
    const coverage = describeCatalogueCoverage({
      ...fullCatalogue(),
      ghost_part: { imageUrl: null },
    });

    expect(coverage.undrawable).toEqual(['ghost_part']);
    expect(formatCoverageWarning(coverage)).toContain('Upload artwork or retire them');
  });

  it('accepts a remote-only asset as perfectly drawable', () => {
    const coverage = describeCatalogueCoverage({
      ...fullCatalogue(),
      uploaded_part: { imageUrl: 'https://cdn.example.com/uploaded.png' },
    });

    expect(coverage.undrawable).toEqual([]);
    expect(coverage.isComplete).toBe(true);
  });

  it('reports both kinds of drift at once', () => {
    const partial = fullCatalogue();
    delete partial.suit1;

    const coverage = describeCatalogueCoverage({ ...partial, ghost_part: { imageUrl: null } });
    const warning = formatCoverageWarning(coverage)!;

    expect(coverage.missing).toEqual(['suit1']);
    expect(coverage.undrawable).toEqual(['ghost_part']);
    expect(warning.split('\n')).toHaveLength(2);
  });
});

/**
 * The reverse direction: a catalogue asset the app can draw but can never put
 * in front of anyone. Now that the pickers merge the catalogue in, an uploaded
 * asset normally appears on its own - one that cannot is a data problem, and
 * silent without this.
 */
describe('assets the app cannot list', () => {
  const drawable = (over: any = {}) => ({
    imageUrl: 'https://s3/x.png',
    slot: 'outfit',
    target: 'female',
    categories: [4],
    isRetired: false,
    ...over,
  });

  it('reports a slot the app has no picker for', () => {
    const coverage = describeCatalogueCoverage({
      mystery: drawable({ slot: 'cape' }),
    } as any);

    expect(coverage.unlistable).toEqual(['mystery']);
    expect(coverage.isComplete).toBe(false);
  });

  it('reports a row with no categories to match against', () => {
    const coverage = describeCatalogueCoverage({
      orphan: drawable({ categories: [] }),
    } as any);

    expect(coverage.unlistable).toEqual(['orphan']);
  });

  it('reports a row with no target', () => {
    const coverage = describeCatalogueCoverage({
      genderless: drawable({ target: undefined }),
    } as any);

    expect(coverage.unlistable).toEqual(['genderless']);
  });

  it('accepts a well-formed uploaded garment', () => {
    const coverage = describeCatalogueCoverage({ good: drawable() } as any);

    expect(coverage.unlistable).toEqual([]);
  });

  it('accepts a base, which is listable too', () => {
    const coverage = describeCatalogueCoverage({
      body: drawable({ slot: 'base' }),
    } as any);

    expect(coverage.unlistable).toEqual([]);
  });

  it('ignores a retired asset, which is meant not to be listed', () => {
    const coverage = describeCatalogueCoverage({
      old: drawable({ slot: 'cape', isRetired: true }),
    } as any);

    expect(coverage.unlistable).toEqual([]);
  });

  // ArtworkCatalogue promises only artwork. Judging rows that never claimed to
  // describe themselves would flag the entire catalogue.
  it('does not judge a lookup that carries only artwork', () => {
    const coverage = describeCatalogueCoverage({
      hair6: { imageUrl: 'https://s3/hair6.png' },
    } as any);

    expect(coverage.unlistable).toEqual([]);
  });

  it('says so in the warning text', () => {
    const warning = formatCoverageWarning(
      describeCatalogueCoverage({ mystery: drawable({ slot: 'cape' }) } as any),
    );

    expect(warning).toMatch(/can never be shown/);
    expect(warning).toContain('mystery');
  });
});
