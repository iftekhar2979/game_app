import { Animated, Easing } from 'react-native';

/**
 * One clock for every shimmer on screen.
 *
 * A skeleton screen is a dozen placeholder blocks at once. Giving each its own
 * `Animated.loop` would mean a dozen animations started at slightly different
 * moments, so the highlights drift out of phase and the screen flickers instead
 * of sweeping. Sharing a single driver keeps them in step: the sweep reads as
 * one band crossing the page, which is the whole effect.
 *
 * It is also the cheap option. One value is sent to the native driver once,
 * then every block interpolates it locally.
 *
 * Ref-counted rather than started at import time, because an animation that
 * never stops keeps the JS thread awake for as long as the app is open - and a
 * skeleton is by definition temporary.
 */

export const SWEEP_DURATION_MS = 1100;

export const sweep = new Animated.Value(0);

let holders = 0;
let loop: Animated.CompositeAnimation | null = null;

/**
 * Start the sweep if it is not already running, and return the release.
 *
 * The caller must release exactly once. Releasing the last hold stops the loop
 * and rewinds it, so the next skeleton starts at the left edge rather than
 * wherever the previous screen happened to leave it.
 */
export function acquireSweep(): () => void {
  holders += 1;

  if (holders === 1) {
    loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: SWEEP_DURATION_MS,
        // Linear on purpose: an eased sweep looks like it is being dragged,
        // and a loading state should not appear to labour.
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
  }

  let released = false;

  return () => {
    // Guarded so a double release - a strict-mode double effect teardown, say -
    // cannot drive the count negative and leave the loop running forever.
    if (released) return;
    released = true;

    holders -= 1;

    if (holders === 0) {
      loop?.stop();
      loop = null;
      sweep.setValue(0);
    }
  };
}

/** How many blocks are currently animating. Exposed for tests. */
export function sweepHolders(): number {
  return holders;
}

/** Whether the shared loop is running. Exposed for tests. */
export function isSweeping(): boolean {
  return loop !== null;
}
