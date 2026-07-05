import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface OutlineButtonProps {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const OutlineButton: React.FC<OutlineButtonProps> = ({ title, onPress, style }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row items-center justify-center border border-purple-500 rounded-full py-4 px-8"
      style={[styles.buttonBg, style]}
    >
      <Text className="text-white font-semibold text-lg tracking-wide mr-2">{title}</Text>
      <Text className="text-white text-lg">↗</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBg: {
    backgroundColor: 'rgba(59, 7, 100, 0.5)', // Subtle dark purple background
  },
});

export default OutlineButton;
