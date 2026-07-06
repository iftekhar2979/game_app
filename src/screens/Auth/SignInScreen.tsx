import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Mail, KeyRound } from 'lucide-react-native';
import AuthLayout from '../../components/Layout/AuthLayout';
import AuthInput from '../../components/Input/AuthInput';
import PrimaryButton from '../../components/Button/PrimaryButton';

const SignInScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthLayout>
      {/* Header */}
      <View className="px-6 mb-10 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Title & Subtitle */}
      <View className="px-6 items-center mb-10 mt-10">
        <Text className="text-3xl text-white font-bold tracking-tight mb-4">Sign in</Text>
        <Text className="text-textSecondary text-center text-sm leading-5 px-4">
          Enter your email and password, sign in into the app
        </Text>
      </View>

      {/* Form Inputs */}
      <View className="px-6 mb-2">
        <AuthInput
          placeholder="Enter Email"
          value={email}
          onChangeText={setEmail}
          leftIcon={<Mail color="#A3A3A3" size={20} />}
          keyboardType="email-address"
        />

        <AuthInput
          placeholder="Enter Password"
          value={password}
          onChangeText={setPassword}
          leftIcon={<KeyRound color="#A3A3A3" size={20} />}
          isPassword
        />

        <TouchableOpacity className="items-end mt-2">
          <Text className="text-[#FFB444] font-medium text-sm">Forgot Password</Text>
        </TouchableOpacity>
      </View>

      {/* Spacer to push button to bottom */}
      <View className="flex-1 min-h-[60px]" />

      {/* Bottom Actions */}
      <View className="px-6 pb-6">
        <PrimaryButton
          title="Sign in"
          onPress={() => console.log('Sign in pressed', { email, password })}
        />

        <View className="flex-row justify-center mt-6">
          <Text className="text-textSecondary text-sm">Don't have an account ? </Text>
          <TouchableOpacity>
            <Text className="text-[#FFB444] text-sm underline font-medium">Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
};

export default SignInScreen;
