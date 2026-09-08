import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';

import { ArtworkCatalogue, sourceForAsset, sourceForBase } from '../../avatar/assetSource';
import ArtworkImage from '../Avatar/ArtworkImage';
import { FULLBODY_STAGE_SCALE, getEyeSource } from '../../avatar/registry';
import { baseOf, resolveConfig } from '../../avatar/resolveConfig';
import { blinkOpacity, blinkSourcesFor } from '../../avatar/baseCatalogue';
import { AvatarConfig, AvatarLayer, AvatarSlot } from '../../avatar/types';
import { hexToTintMatrix } from '../../avatar/hairTint';
import Avatar from './Avatar';

/**
 * The live, layered avatar — the same stack the editor previews.
 *
 * Saved looks used to be shown as the flat PNG snapshot taken at save time,
 * squeezed into a circular frame, so a full-body avatar arrived as a tiny
 * letterboxed figure with no blink and no breath. This renders from the stored
 * `avatarConfig` instead, so the wardrobe shows what the editor showed.
 *
 * Paint order matches `GenerateAvatarScreen` exactly: base, skin, eyes, then
 * clothing bottom-up, hair last. Eyes sit under the clothing layers because the
 * blink art covers the whole body, not just the face.
 */


let filterSeq = 0;

interface AvatarPreviewProps {
  config?: AvatarConfig | null;
  /** Height of the framed stage. Width fills the parent. */
  height: number;
  /** Blink and breathe. Turn off for dense lists or capture frames. */
  animated?: boolean;
  /** Shown when the config cannot be resolved — e.g. a look saved before configs existed. */
  fallbackUri?: string | null;
  fallbackName?: string | null;
  /** Card chrome. Off gives a bare figure on transparency. */
  framed?: boolean;
  /**
   * Redirects layers to uploaded artwork where the catalogue has any.
   *
   * Optional so every existing call site keeps rendering from the bundle. The
   * wardrobe passes one; a profile thumbnail has no reason to.
   */
  catalogue?: ArtworkCatalogue;
}

export default function AvatarPreview({
  config,
  height,
  animated = true,
  fallbackUri,
  fallbackName,
  framed = true,
  catalogue,
}: AvatarPreviewProps) {
  const layers = useMemo(() => resolveConfig(config, catalogue), [config, catalogue]);
  const base = baseOf(config, catalogue);
  // Null when this body does not blink at all, which is an admin's choice
  // rather than a missing asset.
  const blink = base ? blinkSourcesFor(base) : null;

  // Stable per-instance id: a grid renders several of these at once and SVG
  // filter ids are global, so a shared id would tint the wrong avatar's hair.
  const filterId = useRef(`hairTint${(filterSeq += 1)}`).current;

  const [eyeState, setEyeState] = useState<'open' | 'half_closed' | 'closed'>('open');
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || !base) return;

    // Timeouts are tracked so a card scrolling out mid-blink cannot set state
    // after unmount.
    const pending: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, state: typeof eyeState) => {
      pending.push(setTimeout(() => setEyeState(state), ms));
    };

    const blink = setInterval(() => {
      setEyeState('half_closed');
      at(150, 'closed');
      at(300, 'half_closed');
      at(450, 'open');
    }, 3000);

    return () => {
      clearInterval(blink);
      pending.forEach(clearTimeout);
    };
  }, [animated, base]);

  useEffect(() => {
    if (!animated || !base) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [animated, base, breatheAnim]);

  // Nothing resolvable to draw: fall back to the snapshot, then to initials.
  if (!base || !layers.length) {
    return <Avatar uri={fallbackUri} name={fallbackName} size={height} />;
  }

  const scaleY = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] });
  const scaleX = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.008] });

  const hairLayer = layers.find((layer) => layer.slot === 'hair');
  const bodyLayers = layers.filter((layer) => layer.slot !== 'hair' && layer.slot !== 'base');
  // Taken from the resolved layer, not `base.source`, so a base whose artwork
  // has moved to S3 draws remotely like every other layer.
  const baseSource = layers.find((layer) => layer.slot === 'base')?.source ?? base.source;

  /**
   * The bundled copy of a layer, used only if its remote artwork fails.
   *
   * Resolving without a catalogue is exactly "whatever ships in the app", so a
   * failed download falls back to the art this build already has rather than to
   * a hole in the avatar.
   */
  const bundled = (slot: AvatarLayer['slot'], assetId: string) =>
    slot === 'base' ? sourceForBase(assetId) : sourceForAsset(slot as AvatarSlot, assetId);

  return (
    <View style={[styles.stageFrame, framed && styles.framed, { height }]}>
      <Animated.View
        style={[
          styles.stage,
          {
            // Mirrors the editor's stage transform, including the static scale
            // it composes in. Keep these two in step or the wardrobe and the
            // editor will frame the same avatar differently.
            transform: [{ scaleX }, { scaleY }, { scale: FULLBODY_STAGE_SCALE }],
            transformOrigin: 'bottom center' as any,
          },
        ]}
      >
        <ArtworkImage
          source={baseSource}
          fallback={sourceForBase(base.id)}
          style={styles.layer}
          resizeMode="contain"
        />

        {/* Skin overlay, where the base uses one. */}
        {bodyLayers
          .filter((layer) => layer.slot === 'bodyColor')
          .map((layer) => (
            <ArtworkImage
              key={layer.assetId}
              source={layer.source}
              fallback={bundled(layer.slot, layer.assetId)}
              style={styles.layer}
              resizeMode="contain"
            />
          ))}

        {/* Blink overlays: both mounted, opacity toggled, so neither pops in
            late.

            A body uploaded through the dashboard brings its own closed-eye
            artwork, since the bundled overlays are drawn for the five shipped
            silhouettes and would not sit on anything else. Without one it falls
            back to those, and a body with blinking turned off draws neither. */}
        {/* Open eyes, for a body drawn without any. Always visible; the closed
            frames are painted over it. Every bundled body has its eyes in the
            base artwork, so there is nothing to draw here for those. */}
        {blink?.normal ? (
          <Image source={blink.normal} style={styles.layer} resizeMode="contain" />
        ) : null}

        {blink ? (
          blink.blink ? (
            /* One uploaded frame serves both closed phases, faded for the
               half - see blinkOpacity. */
            <Image
              source={blink.blink}
              style={[styles.layer, { opacity: blinkOpacity(eyeState) }]}
              resizeMode="contain"
            />
          ) : (
            <>
              <Image
                source={getEyeSource('half', base.target, base.category)}
                style={[styles.layer, { opacity: eyeState === 'half_closed' ? 1 : 0 }]}
                resizeMode="contain"
              />
              <Image
                source={getEyeSource('full', base.target, base.category)}
                style={[styles.layer, { opacity: eyeState === 'closed' ? 1 : 0 }]}
                resizeMode="contain"
              />
            </>
          )
        ) : null}

        {/* Clothing, in the registry's paint order. */}
        {bodyLayers
          .filter((layer) => layer.slot !== 'bodyColor')
          .map((layer) => (
            <ArtworkImage
              key={layer.assetId}
              source={layer.source}
              fallback={bundled(layer.slot, layer.assetId)}
              style={styles.layer}
              resizeMode="contain"
            />
          ))}

        {hairLayer &&
          (hairLayer.tint ? (
            <View style={styles.layer}>
              <Svg width="100%" height="100%">
                <Defs>
                  <Filter id={filterId}>
                    <FeColorMatrix type="matrix" values={hexToTintMatrix(hairLayer.tint)} />
                  </Filter>
                </Defs>
                <SvgImage
                  width="100%"
                  height="100%"
                  preserveAspectRatio="xMidYMid meet"
                  href={hairLayer.source}
                  filter={`url(#${filterId})`}
                />
              </Svg>
            </View>
          ) : (
            <ArtworkImage
              source={hairLayer.source}
              fallback={bundled(hairLayer.slot, hairLayer.assetId)}
              style={styles.layer}
              resizeMode="contain"
            />
          ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stageFrame: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
  },
  framed: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2E2140',
    backgroundColor: '#160B26',
  },
  // Wider than the frame so `contain` sizes the figure by height, matching the
  // editor's framing rather than pillarboxing it.
  stage: {
    width: '160%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});
