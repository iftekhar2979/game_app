import React, { useCallback, useEffect, useState } from 'react';
import { Image, ImageProps } from 'react-native';

import { AssetSource, isRemoteSource } from '../../avatar/types';

/**
 * An avatar layer that survives its own download failing.
 *
 * Serving artwork remotely introduced a failure mode the bundle never had. A
 * `require()` handle is in the binary and cannot fail; a URL can 404, time out,
 * or arrive on a dead connection, and React Native's `<Image>` answers all
 * three the same way — by drawing nothing, silently. An avatar that was
 * bulletproof would quietly lose its hair.
 *
 * So every layer keeps its bundled copy as a parachute. Remote is tried first
 * because that is the artwork the catalogue considers current; the bundled
 * version is used the moment the remote one fails. Nothing about this is
 * visible to the user, which is the point.
 *
 * A layer with no fallback — artwork uploaded after the app shipped, so it has
 * no bundled counterpart — renders nothing rather than a broken-image box.
 */

interface ArtworkImageProps extends Omit<ImageProps, 'source'> {
  /** Preferred artwork, usually remote. */
  source: AssetSource | null | undefined;
  /** Bundled artwork for the same asset, used only if `source` fails. */
  fallback?: AssetSource | null;
}

export function useArtworkSource(
  source: AssetSource | null | undefined,
  fallback?: AssetSource | null,
) {
  const [failed, setFailed] = useState(false);

  /** Identity of the current artwork: the URL when remote, the handle when not. */
  const sourceKey = isRemoteSource(source) ? source.uri : source;

  // A new source deserves a fresh attempt: the URL may have changed because the
  // artwork was replaced, and the previous failure says nothing about this one.
  useEffect(() => {
    setFailed(false);
  }, [sourceKey]);

  const onError = useCallback(() => setFailed(true), []);

  const resolved = failed ? fallback ?? null : source ?? fallback ?? null;

  return {
    source: resolved,
    /** Only a remote source can fail, so only it needs the handler. */
    onError: isRemoteSource(resolved) ? onError : undefined,
    hasFallenBack: failed && Boolean(fallback),
  };
}

export default function ArtworkImage({ source, fallback, ...rest }: ArtworkImageProps) {
  const artwork = useArtworkSource(source, fallback);

  if (!artwork.source) return null;

  return <Image {...rest} source={artwork.source} onError={artwork.onError} />;
}
