import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';

import { ArtworkCatalogue, sourceForAsset, sourceForBase } from '../../avatar/assetSource';
import ArtworkImage from '../Avatar/ArtworkImage';
import { FULLBODY_STAGE_SCALE, getEyeSource } from '../../avatar/registry';
import { baseOf, resolveConfig } from '../../avatar/resolveConfig';
import { blinkSourcesFor, HALF_CLOSED_OPACITY } from '../../avatar/baseCatalogue';
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

/** Where the full-body figure sits in the artwork canvas, as fractions of its height. */
const FILL_FIGURE_TOP = 0.04;
const FILL_FIGURE_BOTTOM = 0.97;

/**
 * Where the figure sits inside a saved snapshot, as fractions of its height.
 *
 * The editor photographs its whole preview box, figure and empty margins
 * alike, so fitting the photo as-is leaves a band of nothing under the feet and
 * the character floats. The box's framing is fixed - full width less 48pt of
 * padding, 16pt top inset, a 160%-wide stage, the 2400x1309 canvas centred in
 * it and then scaled from the bottom - so the figure's position follows from
 * the photo's aspect ratio alone. Null for a bust, which has no feet to place.
 */
function snapshotFigureBounds(aspect: number): { top: number; bottom: number } | null {
  // Full-body boxes are far taller than wide; the half-body one is near square.
  if (aspect < 1.3) return null;
  const width = Dimensions.get('window').width - 48;
  const frame = aspect;
  const stage = frame - 16 / width;
  const canvas = Math.min(1.6 * (1309 / 2400), stage);
  const scaled = canvas * FULLBODY_STAGE_SCALE;
  const canvasBottom = frame - ((stage - canvas) / 2) * FULLBODY_STAGE_SCALE;
  const canvasTop = canvasBottom - scaled;
  return {
    top: (canvasTop + scaled * FILL_FIGURE_TOP) / frame,
    bottom: (canvasTop + scaled * FILL_FIGURE_BOTTOM) / frame,
  };
}

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
  /**
   * Size the figure to the frame instead of the editor's framing: hair at the
   * top edge, shoes at the bottom. Width no longer matters, so a short card
   * still gets a full-height figure.
   */
  fill?: boolean;
}

export default function AvatarPreview({
  config,
  height,
  animated = true,
  fallbackUri,
  fallbackName,
  framed = true,
  catalogue,
  fill = false,
}: AvatarPreviewProps) {
  const layers = useMemo(() => resolveConfig(config, catalogue), [config, catalogue]);
  // Memoised: `baseOf` builds a fresh object per call, and the animations
  // below must not restart on every render. Each blink step re-renders, so an
  // unstable base cancelled the blink midway and left the eyes half shut.
  const base = useMemo(() => baseOf(config, catalogue), [config, catalogue]);
  const hasBase = Boolean(base);
  // Null when this body does not blink at all, which is an admin's choice
  // rather than a missing asset.
  const blink = base ? blinkSourcesFor(base) : null;

  // Stable per-instance id: a grid renders several of these at once and SVG
  // filter ids are global, so a shared id would tint the wrong avatar's hair.
  const filterId = useRef(`hairTint${(filterSeq += 1)}`).current;

  // The snapshot's shape, so fill mode can find the figure inside it.
  const [snapshotAspect, setSnapshotAspect] = useState<number | null>(null);
  const usesSnapshot = (!base || !layers.length) && !!fallbackUri;
  useEffect(() => {
    if (!fill || !usesSnapshot || !fallbackUri) return;
    let live = true;
    Image.getSize(
      fallbackUri,
      (w, h) => live && w > 0 && setSnapshotAspect(h / w),
      () => live && setSnapshotAspect(null),
    );
    return () => {
      live = false;
    };
  }, [fill, usesSnapshot, fallbackUri]);

  /**
   * The eyelid: 0 open, 1 half closed, 2 closed.
   *
   * Driven natively rather than through state. A state change per phase
   * re-rendered every layer - the SVG-filtered hair included - four times per
   * blink, and on a busy screen those renders outran the ~100ms phases, so
   * frames were dropped and the eyes never quite shut or stuttered open.
   */
  const lid = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || !hasBase) return;

    const blinkOnce = () =>
      Animated.sequence([
        Animated.timing(lid, {
          toValue: 2,
          duration: 90,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(60),
        Animated.timing(lid, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

    // Irregular gaps with the odd double blink: a metronome reads as robotic.
    let next: ReturnType<typeof setTimeout>;
    let running: Animated.CompositeAnimation | null = null;
    const schedule = () => {
      next = setTimeout(() => {
        running =
          Math.random() < 0.2
            ? Animated.sequence([blinkOnce(), Animated.delay(120), blinkOnce()])
            : blinkOnce();
        running.start(schedule);
      }, 2500 + Math.random() * 3000);
    };
    schedule();

    return () => {
      clearTimeout(next);
      running?.stop();
      // Never leave the eyes shut if this stops mid-blink.
      lid.setValue(0);
    };
  }, [animated, hasBase, lid]);

  const halfLidOpacity = lid.interpolate({
    inputRange: [0, 0.4, 1, 1.6, 2],
    outputRange: [0, 1, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const closedLidOpacity = lid.interpolate({
    inputRange: [1, 1.6, 2],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });
  // One uploaded frame serves both phases, faded for the half; see blinkOpacity.
  const singleLidOpacity = lid.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, HALF_CLOSED_OPACITY, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (!animated || !hasBase) return;

    const loop = Animated.loop(
      Animated.sequence([
        // Sine easing so the turn at each end is gentle rather than a bounce.
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [animated, hasBase, breatheAnim]);

  /**
   * Nothing resolvable to draw: fall back to the snapshot, then to initials.
   *
   * The snapshot is fitted to the stage rather than handed to `Avatar`, which
   * draws a circle of `size x size` and crops to fill it. Passing the stage's
   * *height* as that size made a tall stage overflow a narrower parent, so a
   * full-body snapshot arrived with its head and both sides cut off - the
   * failure looked like a rendering bug rather than a fallback.
   *
   * `contain` because a snapshot is a whole avatar: there is no part of it that
   * is safe to crop.
   */
  if (!base || !layers.length) {
    if (!fallbackUri) {
      return <Avatar uri={null} name={fallbackName} size={height} />;
    }

    const bounds = fill && snapshotAspect ? snapshotFigureBounds(snapshotAspect) : null;
    if (bounds && snapshotAspect) {
      // Scale the photo so the figure spans the frame, hair at the top and
      // feet on the bottom edge, and let the frame clip the empty margins.
      const imageHeight = (height - 6) / (bounds.bottom - bounds.top);
      return (
        <View style={[styles.stageFrame, framed && styles.framed, styles.fillFrame, { height }]}>
          <Image
            source={{ uri: fallbackUri }}
            style={{
              position: 'absolute',
              height: imageHeight,
              width: imageHeight / snapshotAspect,
              top: height - imageHeight * bounds.bottom,
            }}
            resizeMode="stretch"
          />
        </View>
      );
    }

    return (
      <View style={[styles.stageFrame, framed && styles.framed, { height }]}>
        <Image
          source={{ uri: fallbackUri }}
          style={styles.layer}
          resizeMode="contain"
        />
      </View>
    );
  }

  /**
   * Fill mode sizes the 2400x1309 canvas so the figure inside it - hair from
   * ~4% of the canvas height, shoes to ~97% - spans the frame once
   * FULLBODY_STAGE_SCALE is applied, then nudges it down past the canvas's
   * empty strip under the feet. A few px are kept clear for the breath.
   */
  const fillCanvasHeight = (height - 6) / (FULLBODY_STAGE_SCALE * (FILL_FIGURE_BOTTOM - FILL_FIGURE_TOP));
  // The figure bounds above are full-body art; a bust keeps the normal framing.
  const fillsFigure = fill && base.isFullbody !== false;
  const fillStage = fillsFigure
    ? {
        width: fillCanvasHeight * (2400 / 1309),
        height: fillCanvasHeight,
      }
    : null;
  const fillOffset = fillsFigure
    ? [{ translateY: fillCanvasHeight * FULLBODY_STAGE_SCALE * (1 - FILL_FIGURE_BOTTOM) }]
    : [];

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
    <View style={[styles.stageFrame, framed && styles.framed, fillsFigure && styles.fillFrame, { height }]}>
      <Animated.View
        style={[
          styles.stage,
          fillStage,
          {
            // Mirrors the editor's stage transform, including the static scale
            // it composes in. Keep these two in step or the wardrobe and the
            // editor will frame the same avatar differently.
            transform: [...fillOffset, { scaleX }, { scaleY }, { scale: FULLBODY_STAGE_SCALE }],
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
            <Animated.Image
              source={blink.blink}
              style={[styles.layer, { opacity: singleLidOpacity }]}
              resizeMode="contain"
            />
          ) : (
            <>
              <Animated.Image
                source={getEyeSource('half', base.target, base.id)}
                style={[styles.layer, { opacity: halfLidOpacity }]}
                resizeMode="contain"
              />
              <Animated.Image
                source={getEyeSource('full', base.target, base.id)}
                style={[styles.layer, { opacity: closedLidOpacity }]}
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
  fillFrame: {
    paddingTop: 0,
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
