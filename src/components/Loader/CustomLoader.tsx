import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { colors } from '../../theme/colors';

interface CustomLoaderProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const CustomLoader: React.FC<CustomLoaderProps> = ({
  size = 40,
  color = colors.primary,
  strokeWidth = 4,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          transform: [{ rotate: spin }],
        }}
      />
    </View>
  );
};

export default CustomLoader;
