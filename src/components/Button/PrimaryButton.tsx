import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const PrimaryButton = ({ title, style, textStyle, ...props }: PrimaryButtonProps) => {
  return (
    <TouchableOpacity
      className="w-full bg-backgroundSecondary py-4 rounded-3xl items-center justify-center flex-row"
      style={style}
      activeOpacity={0.8}
      {...props}
    >
      <Text className="text-white font-bold text-base tracking-wide" style={textStyle}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default PrimaryButton;
