import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

const OTPInput = ({ length = 6, value, onChange }: OTPInputProps) => {
  const inputRefs = useRef<TextInput[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChangeText = (text: string, index: number) => {
    // Only take the last character typed (useful if they paste)
    const newChar = text.slice(-1);
    
    let newValue = value.split('');
    newValue[index] = newChar;
    
    const joinedValue = newValue.join('');
    onChange(joinedValue);

    // Auto-advance
    if (newChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      let newValue = value.split('');
      if (newValue[index]) {
        // If there's a character, just delete it
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // If it's already empty, go back and delete previous
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View className="flex-row justify-between w-full">
      {Array(length)
        .fill(0)
        .map((_, index) => {
          const char = value[index] || '';
          const isFocused = focusedIndex === index;

          return (
            <View
              key={index}
              className={`w-12 h-12 border rounded-xl items-center justify-center ${
                isFocused ? 'border-[#832C9D] bg-[#832C9D]/10' : 'border-[#3A144E]'
              }`}
            >
              <TextInput
                ref={(ref) => {
                  if (ref) inputRefs.current[index] = ref;
                }}
                className="text-white text-xl font-medium w-full h-full text-center"
                value={char}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
                keyboardType="number-pad"
                maxLength={1}
                caretHidden
                selectTextOnFocus
              />
            </View>
          );
        })}
    </View>
  );
};

export default OTPInput;
