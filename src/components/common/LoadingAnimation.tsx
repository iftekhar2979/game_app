import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

/**
 * The app's loading state.
 *
 * One component rather than an `ActivityIndicator` per screen, so the app has a
 * single loading look and changing it is one edit. The animation is authored in
 * the app's own palette - gold outer ring, purple inner, the two colours the
 * auth and avatar screens already use - rather than a stock spinner that
 * belongs to no product.
 *
 * Lottie is a native module. If it ever fails to resolve - a JS bundle running
 * against a binary built before the dependency was added, which is exactly what
 * happens on a teammate's machine after a pull - falling back to the platform
 * spinner keeps the screen honest. A loading state that throws is worse than a
 * plain one.
 */

interface LoadingAnimationProps {
  /** Rendered edge to edge on the app's background. For a full-screen wait. */
  fullScreen?: boolean;
  /** Pixel size of the animation. */
  size?: number;
  /** Optional line beneath it, for a wait long enough to need explaining. */
  label?: string;
}

export default function LoadingAnimation({
  fullScreen = false,
  size = 120,
  label,
}: LoadingAnimationProps) {
  const body = (
    <>
      {LottieView ? (
        <LottieView
          source={require('../../assets/animations/loading.json')}
          autoPlay
          loop
          style={{ width: size, height: size }}
          // Rendered by the native player; `resizeMode` keeps the rings round
          // at any size rather than stretching them to the box.
          resizeMode="contain"
        />
      ) : (
        <ActivityIndicator size="large" color="#E0B566" />
      )}

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </>
  );

  if (!fullScreen) {
    return <View style={styles.inline}>{body}</View>;
  }

  return <View style={styles.fullScreen}>{body}</View>;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    // The app's own background, so the fallback does not flash a different
    // colour before the first screen paints.
    backgroundColor: '#0F0318',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 12,
    color: '#A3A3A3',
    fontSize: 13,
  },
});
