import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';

import { FULLBODY_STAGE_SCALE, getEyeSource } from '../../avatar/registry';
import { baseOf, resolveConfig } from '../../avatar/resolveConfig';
import { AvatarConfig } from '../../avatar/types';
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

/** Same tint maths as the editor: scale each channel, keep 25% contrast. */
const hexToTintMatrix = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';

  const [r, g, b] = [1, 2, 3].map((i) => parseInt(result[i], 16) / 255);
  return `${0.25 + 0.75 * r} 0 0 0 0  0 ${0.25 + 0.75 * g} 0 0 0  0 0 ${0.25 + 0.75 * b} 0 0  0 0 0 1 0`;
};

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
}

export default function AvatarPreview({
  config,
  height,
  animated = true,
  fallbackUri,
  fallbackName,
  framed = true,
}: AvatarPreviewProps) {
  const layers = useMemo(() => resolveConfig(config), [config]);
  const base = baseOf(config);

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
        <Image source={base.source} style={styles.layer} resizeMode="contain" />

        {/* Skin overlay, where the base uses one. */}
        {bodyLayers
          .filter((layer) => layer.slot === 'bodyColor')
          .map((layer) => (
            <Image
              key={layer.assetId}
              source={layer.source}
              style={styles.layer}
              resizeMode="contain"
            />
          ))}

        {/* Blink overlays: both mounted, opacity toggled, so neither pops in late. */}
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

        {/* Clothing, in the registry's paint order. */}
        {bodyLayers
          .filter((layer) => layer.slot !== 'bodyColor')
          .map((layer) => (
            <Image
              key={layer.assetId}
              source={layer.source}
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
            <Image source={hairLayer.source} style={styles.layer} resizeMode="contain" />
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
