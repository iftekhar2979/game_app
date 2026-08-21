import {
  AvatarAssetResponse,
  describePurchaseError,
  resolveAssetState,
  toCatalogueLookup,
} from '../src/store/api/avatarAssetsTransforms';
import { BASES, getAssetById, listFor } from '../src/avatar/registry';
import { describeUsedAssets, normaliseConfig, resolveConfig } from '../src/avatar/resolveConfig';
import { AvatarConfig } from '../src/avatar/types';

/**
 * Catalogue integration.
 *
 * The backend decides what may be *picked*; the bundled registry decides what
 * gets *drawn*. These tests hold that line — in particular that no catalogue
 * state, including total failure, can stop a saved avatar rendering.
 */

const row = (over: Partial<AvatarAssetResponse> = {}): AvatarAssetResponse => ({
  id: 'x',
  key: 'hair6',
  slot: 'hair' as const,
  displayName: 'Hair 6',
  description: null,
  target: 'female',
  categories: [4, 5, 6],
  isFullbody: true,
  bundledId: 'hair6',
  imageUrl: null,
  previewUrl: null,
  lifecycle: 'active',
  isFree: true,
  price: 0,
  sortOrder: 1,
  owned: true,
  ...over,
});

describe('catalogue response mapping', () => {
  it('keys the catalogue by stable asset key', () => {
    const result = toCatalogueLookup([row(), row({ key: 'suit1', slot: 'outfit' as const })]);

    expect(Object.keys(result).sort()).toEqual(['hair6', 'suit1']);
    expect(result.hair6.key).toBe('hair6');
  });

  it('marks a free asset owned and selectable', () => {
    const result = toCatalogueLookup([row({ isFree: true, owned: true, price: 0 })]);

    expect(result.hair6).toMatchObject({
      isFree: true,
      isOwned: true,
      isRetired: false,
      isSelectable: true,
    });
  });

  it('marks a paid, owned asset selectable', () => {
    const result = toCatalogueLookup([row({ isFree: false, owned: true, price: 224 })]);

    expect(result.hair6).toMatchObject({ isOwned: true, isSelectable: true, price: 224 });
  });

  it('marks a paid, unowned asset not selectable but keeps its price', () => {
    const result = toCatalogueLookup([row({ isFree: false, owned: false, price: 224 })]);

    expect(result.hair6).toMatchObject({
      isFree: false,
      isOwned: false,
      isSelectable: false,
      price: 224,
    });
  });

  it('marks a retired asset not selectable even when owned', () => {
    const result = toCatalogueLookup([row({ lifecycle: 'retired', owned: true })]);

    expect(result.hair6).toMatchObject({ isRetired: true, isSelectable: false });
  });

  it('falls back to isFree when the payload omits owned', () => {
    const free = toCatalogueLookup([row({ owned: undefined, isFree: true })]);
    const paid = toCatalogueLookup([row({ owned: undefined, isFree: false, price: 10 })]);

    // A partial payload must not read as "everything is locked"...
    expect(free.hair6.isOwned).toBe(true);
    // ...nor as "everything is unlocked".
    expect(paid.hair6.isOwned).toBe(false);
  });

  it('survives an empty or missing data array', () => {
    expect(toCatalogueLookup([])).toEqual({});
    expect(toCatalogueLookup(undefined as any)).toEqual({});
  });

  it('keeps bundledId so the app knows to draw from its own bundle', () => {
    expect(toCatalogueLookup([row()]).hair6.bundledId).toBe('hair6');
  });
});

/**
 * The constraint that matters most: the catalogue governs selection only.
 * Rendering must never depend on it.
 */
describe('rendering does not depend on the catalogue', () => {
  const femaleBase = BASES.find((b) => b.id === 'base_avatar_3')!;

  const savedLook: AvatarConfig = {
    version: 1,
    base: 'base_avatar_3',
    parts: {
      bodyColor: null,
      skirt: 'short_pant_2',
      shoes: 'shoe_1',
      outfit: 'necksleb_1',
      hair: 'hair6',
    },
    hairColor: '#A33327',
  };

  it('resolves a saved avatar purely from bundled artwork', () => {
    const layers = resolveConfig(savedLook);

    expect(layers.length).toBeGreaterThan(1);
    // Every layer carries a bundled `require()` handle, not a URL.
    for (const layer of layers) expect(typeof layer.source).not.toBe('string');
  });

  it('renders an avatar whose part the catalogue calls retired', () => {
    // Retirement is a catalogue fact. The registry still has the artwork, so
    // the layer must still be produced.
    const retired = toCatalogueLookup([row({ key: 'hair6', lifecycle: 'retired' })]);
    expect(retired.hair6.isSelectable).toBe(false);

    const layers = resolveConfig(savedLook);
    expect(layers.find((l) => l.assetId === 'hair6')).toBeDefined();
  });

  it('renders an avatar whose part the catalogue does not list at all', () => {
    const empty = toCatalogueLookup([]);
    expect(empty.hair6).toBeUndefined();

    expect(resolveConfig(savedLook).find((l) => l.assetId === 'hair6')).toBeDefined();
  });

  it('still describes used assets with no catalogue data', () => {
    const items = describeUsedAssets(savedLook);

    expect(items.find((i) => i.slot === 'hair')?.assetId).toBe('hair6');
    expect(items.find((i) => i.slot === 'hair')?.status).toBe('ok');
  });

  it('does not invalidate a saved config when the catalogue is unavailable', () => {
    // normaliseConfig consults the registry only - never the network.
    expect(normaliseConfig(savedLook)).toEqual(savedLook);
  });

  it('keeps every bundled asset resolvable by its registry id', () => {
    for (const asset of listFor('hair', 'female', 4)) {
      expect(getAssetById('hair', asset.id)).toBeDefined();
    }
    expect(femaleBase.source).toBeTruthy();
  });
});

describe('selection rules', () => {
  const catalogue = (over: Partial<AvatarAssetResponse> = {}) =>
    toCatalogueLookup([row(over)]);
  const loaded = { isLoading: false, isError: false, hasData: true };

  it('makes a free asset selectable', () => {
    const state = resolveAssetState(catalogue({ isFree: true, owned: true }).hair6, loaded);

    expect(state).toMatchObject({ availability: 'available', isSelectable: true });
  });

  it('makes a paid, owned asset selectable', () => {
    const state = resolveAssetState(
      catalogue({ isFree: false, owned: true, price: 224 }).hair6,
      loaded,
    );

    expect(state).toMatchObject({ availability: 'available', isSelectable: true });
  });

  it('locks a paid, unowned asset and surfaces its price', () => {
    const state = resolveAssetState(
      catalogue({ isFree: false, owned: false, price: 224 }).hair6,
      loaded,
    );

    expect(state).toMatchObject({ availability: 'locked', isSelectable: false, price: 224 });
  });

  it('blocks a retired asset from new selections', () => {
    const state = resolveAssetState(catalogue({ lifecycle: 'retired' }).hair6, loaded);

    expect(state).toMatchObject({ availability: 'retired', isSelectable: false });
  });

  it('reports loading before the catalogue answers', () => {
    const state = resolveAssetState(undefined, {
      isLoading: true,
      isError: false,
      hasData: false,
    });

    expect(state).toMatchObject({ availability: 'loading', isSelectable: false });
  });

  it('reports unknown when the catalogue request failed', () => {
    const state = resolveAssetState(catalogue().hair6, {
      isLoading: false,
      isError: true,
      hasData: false,
    });

    // Not "available": guessing would invite a save the backend rejects.
    expect(state).toMatchObject({ availability: 'unknown', isSelectable: false });
  });

  it('reports unknown for bundled art the catalogue does not list', () => {
    const state = resolveAssetState(undefined, loaded);

    expect(state).toMatchObject({ availability: 'unknown', isSelectable: false });
  });

  it('never marks anything selectable while the catalogue is unusable', () => {
    for (const status of [
      { isLoading: true, isError: false, hasData: false },
      { isLoading: false, isError: true, hasData: false },
      { isLoading: false, isError: false, hasData: false },
    ]) {
      expect(resolveAssetState(catalogue().hair6, status).isSelectable).toBe(false);
    }
  });
});

describe('purchase failures', () => {
  it('explains insufficient coins', () => {
    const failure = describePurchaseError({ status: 400, data: { message: 'Not enough coins' } });

    expect(failure).toMatchObject({ title: 'Not enough coins', tone: 'error' });
  });

  it('treats already-owned as information, not an error', () => {
    const failure = describePurchaseError({
      status: 409,
      data: { message: 'You already own that asset' },
    });

    expect(failure).toMatchObject({ title: 'Already yours', tone: 'info' });
  });

  it('passes through the reason an asset is unavailable', () => {
    const failure = describePurchaseError({
      status: 400,
      data: { message: 'That asset is no longer available' },
    });

    expect(failure).toMatchObject({
      title: 'Unavailable',
      detail: 'That asset is no longer available',
    });
  });

  it('names an expired session rather than blaming the asset', () => {
    expect(describePurchaseError({ status: 401 })).toMatchObject({
      title: 'Please sign in again',
    });
  });

  it('still says something useful for an unexpected failure', () => {
    const failure = describePurchaseError({ status: 500 });

    expect(failure.title).toBeTruthy();
    expect(failure.detail).toBeTruthy();
    expect(failure.tone).toBe('error');
  });

  it('handles a thrown value with no shape at all', () => {
    expect(() => describePurchaseError(undefined)).not.toThrow();
    expect(describePurchaseError(undefined).tone).toBe('error');
  });
});

describe('an empty catalogue counts as no catalogue', () => {
  it('leaves every asset unknown when nothing was listed', () => {
    // A successful-but-empty response means the collection is unseeded. The
    // picker cannot tell that apart from a failure, so it must not pretend.
    const state = resolveAssetState(undefined, {
      isLoading: false,
      isError: false,
      hasData: false,
    });

    expect(state).toMatchObject({ availability: 'unknown', isSelectable: false });
  });

  it('produces an empty lookup from an empty listing', () => {
    expect(Object.keys(toCatalogueLookup([])).length).toBe(0);
  });
});
