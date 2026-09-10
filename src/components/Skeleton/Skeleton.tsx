import React, { useEffect, useId, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { acquireSweep, sweep } from './shimmerDriver';
import { textLineWidths } from './skeletonText';

/**
 * A shimmering placeholder block.
 *
 * The base is what the screen looks like with the content removed; the
 * highlight is a soft band that crosses it. Both are tinted towards the app's
 * purple rather than neutral grey, so a loading screen still looks like this
 * app - but kept dark and low-contrast, because a skeleton that shouts is worse
 * than a spinner. It is scaffolding, not content.
 *
 * Drawn with `react-native-svg`, which the app already ships: a real gradient
 * band, not a hard-edged rectangle sliding past. The soft edges are the
 * difference between a shimmer and a glitch.
 */

/** The block itself, against the app's near-black surfaces. */
export const SKELETON_BASE = '#1B1622';
/** The band that crosses it. */
export const SKELETON_HIGHLIGHT = '#453A5E';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  /** Defaults to a small radius; pass the pill/circle radius explicitly. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height, radius = 8, style }: SkeletonProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reduceMotion = useReduceMotion();

  // Unique per instance: `react-native-svg` resolves `url(#id)` across the
  // whole tree, and a skeleton screen renders a dozen of these at once. Shared
  // ids make every block paint with whichever gradient mounted last.
  const gradientId = `skeleton-sweep-${useId()}`;

  const animated = !reduceMotion && size.width > 0;

  useEffect(() => {
    if (!animated) return;
    return acquireSweep();
  }, [animated]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    // Guarded: layout fires on every re-render, and setting state
    // unconditionally would loop.
    setSize((current) =>
      current.width === w && current.height === h ? current : { width: w, height: h },
    );
  };

  // The gradient is twice the block wide and carries two bands, so travelling
  // exactly one block-width lands on an identical picture: the loop is seamless
  // and there is always a band somewhere on the block. A single band sliding
  // past instead leaves the whole screen dead for a third of every cycle -
  // which is what a shimmer is supposed to avoid.
  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-size.width, 0],
  });

  return (
    <View
      onLayout={onLayout}
      // The block is decoration; the surrounding skeleton announces the wait.
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        {
          width: width as ViewStyle['width'],
          height: height as ViewStyle['height'],
          borderRadius: radius,
          backgroundColor: SKELETON_BASE,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {animated && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
        >
          <Svg width={size.width * 2} height={size.height}>
            <Defs>
              {/*
                Two bands, one per block-width, each about a third of a block
                across. Narrow on purpose: a band as wide as the block just
                brightens and dims the whole thing at once - a pulse, not a
                sweep - and the movement stops reading as movement.
              */}
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0.1" stopColor={SKELETON_HIGHLIGHT} stopOpacity="0" />
                <Stop offset="0.25" stopColor={SKELETON_HIGHLIGHT} stopOpacity="1" />
                <Stop offset="0.4" stopColor={SKELETON_HIGHLIGHT} stopOpacity="0" />
                <Stop offset="0.6" stopColor={SKELETON_HIGHLIGHT} stopOpacity="0" />
                <Stop offset="0.75" stopColor={SKELETON_HIGHLIGHT} stopOpacity="1" />
                <Stop offset="0.9" stopColor={SKELETON_HIGHLIGHT} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={size.width * 2}
              height={size.height}
              fill={`url(#${gradientId})`}
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

/** A round placeholder, for an avatar. */
export function SkeletonCircle({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

/**
 * Whether the reader has asked the system for less movement.
 *
 * A shimmer is a looping animation with no stop, which is precisely what the
 * setting exists to suppress - so the blocks stay, still, and the layout is
 * unchanged. The shape of what is coming is the useful part; the sweep is the
 * decoration.
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );

    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/**
 * A stack of lines standing in for a run of text.
 *
 * The last line is short - see `textLineWidths`. Without that cue a stack of
 * equal bars reads as an image or a table, not as a sentence.
 */
export function SkeletonText({
  lines = 2,
  lineHeight = 12,
  gap = 8,
  lastLine,
  style,
}: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  /** Fraction of the full width for the final line. */
  lastLine?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const widths = textLineWidths(lines, lastLine);

  return (
    <View style={style}>
      {widths.map((width, index) => (
        <Skeleton
          key={index}
          width={width}
          height={lineHeight}
          radius={lineHeight / 2}
          style={index === 0 ? undefined : { marginTop: gap }}
        />
      ))}
    </View>
  );
}

/**
 * The wrapper a screen's skeleton goes in.
 *
 * A skeleton is a page of empty boxes, and a screen reader walking through them
 * one by one announces nothing at all. Collapsing the region into a single busy
 * element means the wait is stated once, in words, rather than implied by a
 * shape nobody can see.
 */
export function SkeletonRegion({
  label = 'Loading',
  children,
  style,
}: {
  label?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={style}
    >
      {children}
    </View>
  );
}
