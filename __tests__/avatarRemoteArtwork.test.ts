import {
  ArtworkCatalogue,
  isRemotelyServed,
  previewSourceForAsset,
  remoteUrlsOf,
  sourceForAsset,
  sourceForBase,
} from '../src/avatar/assetSource';
import { BASES, getAssetById } from '../src/avatar/registry';
import { describeUsedAssets, resolveConfig } from '../src/avatar/resolveConfig';
import { AvatarConfig, isRemoteSource } from '../src/avatar/types';

/**
 * Where a layer's artwork comes from.
 *
 * The rule under test is one line long — remote wins, bundled is the fallback —
 * but everything about migrating artwork to S3 without breaking saved avatars
 * rests on it, so it is pinned from both directions: that a URL takes over when
 * present, and that its absence changes nothing at all.
 */

const CDN = 'https://cdn.example.com';

const config: AvatarConfig = {
  version: 1,
  base: 'base_avatar_3',
  parts: { hair: 'hair6', outfit: 'suit1', skirt: null, shoes: null, bodyColor: null },
  hairColor: null,
};

const catalogue = (rows: ArtworkCatalogue): ArtworkCatalogue => rows;

describe('artwork source resolution', () => {
  it('prefers uploaded artwork over the bundled copy', () => {
    const source = sourceForAsset(
      'hair',
      'hair6',
      catalogue({ hair6: { imageUrl: `${CDN}/hair6.png` } }),
    );

    expect(source).toEqual({ uri: `${CDN}/hair6.png` });
  });

  it('falls back to the bundle when the row carries no url', () => {
    const source = sourceForAsset('hair', 'hair6', catalogue({ hair6: { imageUrl: null } }));

    expect(source).toBe(getAssetById('hair', 'hair6')!.source);
  });

  it('falls back to the bundle when the catalogue is absent entirely', () => {
    expect(sourceForAsset('hair', 'hair6')).toBe(getAssetById('hair', 'hair6')!.source);
  });

  it('treats an empty string as no url rather than a valid one', () => {
    const source = sourceForAsset('hair', 'hair6', catalogue({ hair6: { imageUrl: '' } }));

    expect(source).toBe(getAssetById('hair', 'hair6')!.source);
  });

  it('resolves bases by the same rule as parts', () => {
    const remote = sourceForBase(
      'base_avatar_3',
      catalogue({ base_avatar_3: { imageUrl: `${CDN}/base.png` } }),
    );

    expect(remote).toEqual({ uri: `${CDN}/base.png` });
    expect(sourceForBase('base_avatar_3')).toBe(BASES[0].source);
  });

  it('returns null when nothing anywhere can draw the asset', () => {
    expect(sourceForAsset('hair', 'no_such_part', catalogue({}))).toBeNull();
    expect(sourceForBase('no_such_base')).toBeNull();
  });

  it('reports whether an asset would be fetched over the network', () => {
    expect(isRemotelyServed('hair', 'hair6')).toBe(false);
    expect(
      isRemotelyServed('hair', 'hair6', catalogue({ hair6: { imageUrl: `${CDN}/h.png` } })),
    ).toBe(true);
  });
});

describe('picker thumbnails', () => {
  it('prefers the small preview over the full-resolution layer', () => {
    const source = previewSourceForAsset(
      'hair',
      'hair6',
      catalogue({ hair6: { imageUrl: `${CDN}/full.png`, previewUrl: `${CDN}/thumb.png` } }),
    );

    expect(source).toEqual({ uri: `${CDN}/thumb.png` });
  });

  it('uses the full artwork when no preview was uploaded', () => {
    const source = previewSourceForAsset(
      'hair',
      'hair6',
      catalogue({ hair6: { imageUrl: `${CDN}/full.png`, previewUrl: null } }),
    );

    expect(source).toEqual({ uri: `${CDN}/full.png` });
  });
});

describe('resolveConfig with a catalogue', () => {
  it('redirects layers to uploaded artwork', () => {
    const layers = resolveConfig(
      config,
      catalogue({
        base_avatar_3: { imageUrl: `${CDN}/base.png` },
        hair6: { imageUrl: `${CDN}/hair6.png` },
      }),
    );

    expect(layers.find((l) => l.slot === 'base')!.source).toEqual({ uri: `${CDN}/base.png` });
    expect(layers.find((l) => l.slot === 'hair')!.source).toEqual({ uri: `${CDN}/hair6.png` });
  });

  it('mixes remote and bundled layers in one look', () => {
    const layers = resolveConfig(config, catalogue({ hair6: { imageUrl: `${CDN}/hair6.png` } }));

    expect(isRemoteSource(layers.find((l) => l.slot === 'hair')!.source)).toBe(true);
    expect(isRemoteSource(layers.find((l) => l.slot === 'outfit')!.source)).toBe(false);
  });

  it('produces exactly the same layers as before when given no catalogue', () => {
    expect(resolveConfig(config, {})).toEqual(resolveConfig(config));
  });

  it('keeps paint order regardless of where artwork comes from', () => {
    const remote = resolveConfig(config, catalogue({ hair6: { imageUrl: `${CDN}/h.png` } }));

    expect(remote.map((l) => l.slot)).toEqual(resolveConfig(config).map((l) => l.slot));
  });

  it('drops a layer the catalogue lists with no artwork at all', () => {
    const orphan: AvatarConfig = {
      ...config,
      parts: { ...config.parts, hair: 'remote_only_hair' },
    };

    const layers = resolveConfig(orphan, catalogue({ remote_only_hair: { imageUrl: null } }));

    expect(layers.some((l) => l.slot === 'hair')).toBe(false);
    // The rest of the look is untouched - one missing part is not a lost avatar.
    expect(layers.some((l) => l.slot === 'outfit')).toBe(true);
  });

  it('draws a part that exists only remotely, with nothing in the bundle', () => {
    const remoteOnly: AvatarConfig = {
      ...config,
      parts: { ...config.parts, hair: 'brand_new_hair' },
    };

    const layers = resolveConfig(
      remoteOnly,
      catalogue({ brand_new_hair: { imageUrl: `${CDN}/new.png` } }),
    );

    expect(layers.find((l) => l.slot === 'hair')!.source).toEqual({ uri: `${CDN}/new.png` });
  });
});

describe('used-assets breakdown', () => {
  it('tells a missing upload apart from a retirement', () => {
    const withUnavailable: AvatarConfig = {
      ...config,
      parts: { ...config.parts, hair: 'listed_but_empty' },
    };

    const [unavailable] = describeUsedAssets(
      withUnavailable,
      catalogue({ listed_but_empty: { imageUrl: null } }),
    ).filter((row) => row.slot === 'hair');

    const [retired] = describeUsedAssets({
      ...config,
      parts: { ...config.parts, hair: 'never_heard_of_it' },
    }).filter((row) => row.slot === 'hair');

    expect(unavailable.status).toBe('unavailable');
    expect(retired.status).toBe('retired');
  });

  it('still reports remote artwork as a resolved row', () => {
    const [hair] = describeUsedAssets(
      config,
      catalogue({ hair6: { imageUrl: `${CDN}/hair6.png` } }),
    ).filter((row) => row.slot === 'hair');

    expect(hair.status).toBe('ok');
    expect(hair.source).toEqual({ uri: `${CDN}/hair6.png` });
  });
});

describe('collecting urls to prefetch', () => {
  it('keeps only remote sources, deduplicated', () => {
    const bundled = getAssetById('hair', 'hair6')!.source;

    expect(
      remoteUrlsOf([bundled, { uri: `${CDN}/a.png` }, { uri: `${CDN}/a.png` }, null, undefined]),
    ).toEqual([`${CDN}/a.png`]);
  });

  it('returns nothing for an entirely bundled look', () => {
    expect(remoteUrlsOf(resolveConfig(config).map((l) => l.source))).toEqual([]);
  });
});
