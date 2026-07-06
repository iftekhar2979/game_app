import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface AuthInputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

const AuthInput = ({ leftIcon, isPassword, style, ...props }: AuthInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(!isPassword);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  return (
    <View className="flex-row items-center bg-black border border-[#3A144E] rounded-xl px-4 py-4 mb-4">
      {leftIcon && <View className="mr-3 opacity-60">{leftIcon}</View>}
      
      <TextInput
        className="flex-1 text-white text-base font-normal h-6 p-0 m-0"
        placeholderTextColor="#666666"
        secureTextEntry={isPassword && !isPasswordVisible}
        style={style}
        autoCapitalize="none"
        {...props}
      />
      
      {isPassword && (
        <TouchableOpacity onPress={togglePasswordVisibility} className="ml-3 opacity-50 p-1">
          {isPasswordVisible ? (
            <EyeOff color="#FFFFFF" size={20} />
          ) : (
            <Eye color="#FFFFFF" size={20} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AuthInput;
