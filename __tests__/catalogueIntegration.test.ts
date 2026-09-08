import catalogue from './fixtures-catalogue.json';
import { toBase } from '../src/avatar/baseCatalogue';
import { isKnownPart, resolveParts } from '../src/avatar/partCatalogue';
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
 *
 * The capture predates scoping, so it is the whole catalogue rather than one
 * character's wardrobe. Its *shape* is unchanged - a lookup keyed by asset key
 * is exactly what a scoped response is - so it is read here as the wardrobe of
 * a single character that happens to own everything. That is the honest
 * reading: it tests that real uploaded rows resolve, draw and are recognised,
 * which is what this file was always for. Which rows a character *gets* is
 * decided on the server and proved in `avatar-scope.spec.ts` there and in
 * `partCatalogue.test.ts` here.
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
        isRetired: false,
      });
      expect(assets[key].imageUrl).toContain('http');
    }
  });
});

describe('a garment uploaded from the dashboard reaches the app', () => {
  it.each(PROBES)('lists $key in the $slot picker', ({ key, slot }) => {
    const options = resolveParts(slot, TARGET, assets);

    expect(options.map((a) => a.id)).toContain(key);
  });

  it.each(PROBES)('draws $key from its uploaded artwork', ({ key, slot }) => {
    const options = resolveParts(slot, TARGET, assets);
    const added = options.find((a) => a.id === key)!;

    expect(added.source).toEqual({ uri: assets[key].imageUrl });
  });

  it.each(PROBES)('recognises $key on a saved avatar', ({ key, slot }) => {
    expect(isKnownPart(slot, key, assets)).toBe(true);
  });
});

describe('existing assets are not disturbed', () => {
  it.each(['outfit', 'skirt', 'shoes', 'hair'] as const)(
    'still resolves every %s the capture contains',
    (slot) => {
      const listed = resolveParts(slot, TARGET, assets).map((a) => a.id);

      const inCapture = Object.values(assets).filter(
        (row: any) => row.slot === slot && !row.isRetired,
      );

      expect(inCapture.length).toBeGreaterThan(0);
      for (const row of inCapture as any[]) {
        expect(listed).toContain(row.key);
      }
    },
  );

  it('still resolves the five bundled bodies', () => {
    // Bodies come from the character endpoint now, so what matters here is that
    // each row in the capture still turns into a drawable body.
    for (const id of [
      'base_avatar_3',
      'base_avatar_4',
      'base_avatar_5',
      'male_avatar_1',
      'male_avatar_2',
    ]) {
      expect(toBase({ ...assets[id], key: id }, id)?.id).toBe(id);
    }
  });
});

describe('slots hold against real data', () => {
  it('files each probe under its own slot only', () => {
    // Gender and category no longer take part in this, so the slot is the only
    // thing keeping a hat out of the shoes picker - worth pinning on real rows.
    for (const { key, slot } of PROBES) {
      for (const other of ['outfit', 'skirt', 'shoes', 'hair'] as const) {
        const listed = resolveParts(other, TARGET, assets)
          .map((a) => a.id)
          .includes(key);

        expect(listed).toBe(other === slot);
      }
    }
  });

  it('draws a row the capture has no artwork for from the bundle, or not at all', () => {
    for (const asset of resolveParts('hair', TARGET, assets)) {
      expect(asset.source).toBeTruthy();
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
