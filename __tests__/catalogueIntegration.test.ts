import catalogue from './fixtures-catalogue.json';
import { resolveBases } from '../src/avatar/baseCatalogue';
import { isKnownPart, resolveParts } from '../src/avatar/partCatalogue';
import { listFor } from '../src/avatar/registry';
import {
  describeCatalogueCoverage,
  formatCoverageWarning,
} from '../src/avatar/catalogueCoverage';

/**
 * The real thing, end to end.
 *
 * This fixture is not hand-written: it is the actual response from
 * `GET /avatar-assets`, captured after creating one garment per slot through
 * the same service the dashboard posts to. Four `probe_*_zz` rows are those
 * garments; the other fifty are the live catalogue.
 *
 * Fixtures drift, so the assertions below check the shape they depend on
 * rather than trusting it - a fixture that stopped containing the probe rows
 * would fail loudly instead of passing vacuously.
 */
const assets = catalogue as any;

const TARGET = 'female' as const;
const CATEGORY = 4;

const PROBES = [
  { key: 'probe_shirt_zz', slot: 'outfit' },
  { key: 'probe_pant_zz', slot: 'skirt' },
  { key: 'probe_shoe_zz', slot: 'shoes' },
  { key: 'probe_hair_zz', slot: 'hair' },
] as const;

describe('the captured catalogue', () => {
  it('is the real payload, with the four uploaded garments in it', () => {
    expect(Object.keys(assets).length).toBeGreaterThan(50);

    for (const { key, slot } of PROBES) {
      expect(assets[key]).toMatchObject({
        slot,
        target: TARGET,
        categories: [CATEGORY],
        isRetired: false,
      });
      expect(assets[key].imageUrl).toContain('http');
    }
  });
});

describe('a garment uploaded from the dashboard reaches the app', () => {
  it.each(PROBES)('lists $key in the $slot picker', ({ key, slot }) => {
    const options = resolveParts(slot, TARGET, CATEGORY, assets);

    expect(options.map((a) => a.id)).toContain(key);
  });

  it.each(PROBES)('draws $key from its uploaded artwork', ({ key, slot }) => {
    const options = resolveParts(slot, TARGET, CATEGORY, assets);
    const added = options.find((a) => a.id === key)!;

    expect(added.source).toEqual({ uri: assets[key].imageUrl });
  });

  it.each(PROBES)('recognises $key on a saved avatar', ({ key, slot }) => {
    expect(isKnownPart(slot, key, assets)).toBe(true);
  });
});

describe('existing assets are not disturbed', () => {
  it.each(['outfit', 'skirt', 'shoes', 'hair'] as const)(
    'keeps every bundled %s at its original index',
    (slot) => {
      const bundled = listFor(slot, TARGET, CATEGORY);
      const merged = resolveParts(slot, TARGET, CATEGORY, assets);

      expect(merged.length).toBeGreaterThanOrEqual(bundled.length);
      bundled.forEach((asset, index) => {
        expect(merged[index].id).toBe(asset.id);
      });
    },
  );

  it('still lists the five bundled bodies', () => {
    const ids = resolveBases(assets).map((b) => b.id);

    for (const id of [
      'base_avatar_3',
      'base_avatar_4',
      'base_avatar_5',
      'male_avatar_1',
      'male_avatar_2',
    ]) {
      expect(ids).toContain(id);
    }
  });
});

describe('compatibility holds against real data', () => {
  it('does not offer female garments to a male body', () => {
    const options = resolveParts('outfit', 'male', 1, assets);

    for (const { key } of PROBES) {
      expect(options.map((a) => a.id)).not.toContain(key);
    }
  });

  it('does not offer category 4 garments to a category 5 body', () => {
    const options = resolveParts('outfit', TARGET, 5, assets);

    expect(options.map((a) => a.id)).not.toContain('probe_shirt_zz');
  });

  it('files each probe under its own slot only', () => {
    for (const { key, slot } of PROBES) {
      for (const other of ['outfit', 'skirt', 'shoes', 'hair'] as const) {
        const listed = resolveParts(other, TARGET, CATEGORY, assets)
          .map((a) => a.id)
          .includes(key);

        expect(listed).toBe(other === slot);
      }
    }
  });
});

describe('coverage against the live catalogue', () => {
  // Every one of these fifty-four rows is well-formed, so the drift detector
  // should have nothing to say. If it does, the message is the useful part.
  it('reports no drift', () => {
    const coverage = describeCatalogueCoverage(assets);

    expect(formatCoverageWarning(coverage)).toBeNull();
    expect(coverage.isComplete).toBe(true);
  });
});
