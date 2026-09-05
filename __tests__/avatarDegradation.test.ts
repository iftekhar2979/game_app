import {
  ArtworkCatalogue,
  artworkForAsset,
  artworkForBase,
  previewArtworkForAsset,
} from '../src/avatar/assetSource';
import { BASES, getAssetById } from '../src/avatar/registry';
import { describeUsedAssets, resolveConfig } from '../src/avatar/resolveConfig';
import { AvatarConfig, isRemoteSource } from '../src/avatar/types';

/**
 * What happens when artwork cannot be drawn.
 *
 * Serving artwork remotely introduced a failure mode the bundle never had: a
 * `require()` handle is in the binary and cannot fail, while a URL can 404,
 * time out, or arrive on a dead connection. These tests pin the rule that keeps
 * that from costing anyone their avatar — every layer that ships in the app
 * keeps its bundled copy as a parachute, and a layer with no parachute is
 * skipped rather than drawn broken.
 */

const CDN = 'https://cdn.example.com';

const config: AvatarConfig = {
  version: 1,
  base: 'base_avatar_3',
  parts: { hair: 'hair6', outfit: 'suit1', skirt: null, shoes: null, bodyColor: null },
  hairColor: null,
};

const catalogue = (rows: ArtworkCatalogue): ArtworkCatalogue => rows;

describe('a bundled asset served remotely', () => {
  const remote = catalogue({ hair6: { imageUrl: `${CDN}/hair6.png` } });

  it('prefers the remote artwork', () => {
    expect(artworkForAsset('hair', 'hair6', remote).source).toEqual({
      uri: `${CDN}/hair6.png`,
    });
  });

  it('still carries its bundled copy as a fallback', () => {
    expect(artworkForAsset('hair', 'hair6', remote).fallback).toBe(
      getAssetById('hair', 'hair6')!.source,
    );
  });

  it('offers the same parachute for a base', () => {
    const art = artworkForBase(
      'base_avatar_3',
      catalogue({ base_avatar_3: { imageUrl: `${CDN}/b.png` } }),
    );

    expect(art.source).toEqual({ uri: `${CDN}/b.png` });
    expect(art.fallback).toBe(BASES[0].source);
  });

  /**
   * The tile prefers the small preview but must fall back to the *full* bundled
   * artwork, never to nothing — there is no bundled thumbnail to fall back to.
   */
  it('falls a picker tile back to full bundled artwork', () => {
    const art = previewArtworkForAsset(
      'hair',
      'hair6',
      catalogue({ hair6: { previewUrl: `${CDN}/thumb.png`, imageUrl: `${CDN}/full.png` } }),
    );

    expect(art.source).toEqual({ uri: `${CDN}/thumb.png` });
    expect(art.fallback).toBe(getAssetById('hair', 'hair6')!.source);
  });
});

describe('an asset that never shipped in the app', () => {
  const remoteOnly = catalogue({ brand_new_hair: { imageUrl: `${CDN}/new.png` } });

  it('has no fallback, because there is nothing to fall back to', () => {
    const art = artworkForAsset('hair', 'brand_new_hair', remoteOnly);

    expect(art.source).toEqual({ uri: `${CDN}/new.png` });
    expect(art.fallback).toBeNull();
  });

  it('is dropped from a look entirely when it cannot be drawn', () => {
    const layers = resolveConfig(
      { ...config, parts: { ...config.parts, hair: 'brand_new_hair' } },
      catalogue({ brand_new_hair: { imageUrl: null } }),
    );

    expect(layers.some((l) => l.slot === 'hair')).toBe(false);
    // One unusable part must not cost the rest of the avatar.
    expect(layers.some((l) => l.slot === 'base')).toBe(true);
    expect(layers.some((l) => l.slot === 'outfit')).toBe(true);
  });
});

describe('the catalogue being unreachable', () => {
  /**
   * The offline and first-run path. An empty catalogue is what every resolver
   * sees before the request lands and after it fails, so this is the case that
   * has to be indistinguishable from the app as it shipped.
   */
  it('renders a saved look exactly as the bundle would', () => {
    expect(resolveConfig(config, {})).toEqual(resolveConfig(config));
  });

  it('leaves every layer drawable without touching the network', () => {
    for (const layer of resolveConfig(config, {})) {
      expect(layer.source).toBeTruthy();
      // A bundled handle, never a URL - nothing here can fail to load.
      expect(isRemoteSource(layer.source)).toBe(false);
    }
  });

  it('describes used assets without inventing a problem', () => {
    const rows = describeUsedAssets(config, {});

    expect(rows.filter((r) => r.status === 'unavailable')).toEqual([]);
    expect(rows.find((r) => r.slot === 'hair')?.status).toBe('ok');
  });
});

describe('telling a missing upload from a retirement', () => {
  it('calls a listed part with no artwork unavailable', () => {
    const rows = describeUsedAssets(
      { ...config, parts: { ...config.parts, hair: 'listed_but_empty' } },
      catalogue({ listed_but_empty: { imageUrl: null } }),
    );

    expect(rows.find((r) => r.slot === 'hair')?.status).toBe('unavailable');
  });

  it('calls a part nothing knows about retired', () => {
    const rows = describeUsedAssets({
      ...config,
      parts: { ...config.parts, hair: 'never_existed' },
    });

    expect(rows.find((r) => r.slot === 'hair')?.status).toBe('retired');
  });

  /** Both are undrawable; the difference is whose problem it is to fix. */
  it('gives neither a source', () => {
    const unavailable = describeUsedAssets(
      { ...config, parts: { ...config.parts, hair: 'listed_but_empty' } },
      catalogue({ listed_but_empty: { imageUrl: null } }),
    ).find((r) => r.slot === 'hair');

    expect(unavailable?.source).toBeNull();
  });
});
