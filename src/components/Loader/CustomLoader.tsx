import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';

interface CustomLoaderProps {
  size?: number;
  /**
   * Kept for the six call sites that already pass one, and now unused.
   *
   * The animation carries the app's two brand colours itself - gold outer ring,
   * purple inner - so a single tint would either flatten them to one hue or
   * fight them. Removing the prop would be a rename across six files for no
   * gain; ignoring it keeps them compiling and honest about what it does.
   *
   * @deprecated The animation supplies its own colours.
   */
  color?: string;
  /** @deprecated The animation supplies its own stroke width. */
  strokeWidth?: number;
}

/**
 * The app's spinner.
 *
 * A Lottie animation rather than a rotating bordered `View`. The old one was a
 * circle with a transparent top edge spun by `Animated` - which reads as a
 * generic spinner belonging to no product, and could only ever be one colour.
 *
 * The internals changed, the signature did not: every existing call site keeps
 * working untouched, which is why this replaced the component rather than
 * adding a second one beside it. Two loaders in one app is how a screen ends up
 * with a spinner that does not match the one before it.
 */
const CustomLoader: React.FC<CustomLoaderProps> = ({ size = 40 }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <LottieView
      source={require('../../assets/animations/loading.json')}
      autoPlay
      loop
      style={{ width: size, height: size }}
      // The rings stay round at any size rather than stretching to the box.
      resizeMode="contain"
    />
  </View>
);

export default CustomLoader;
