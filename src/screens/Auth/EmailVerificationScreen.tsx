import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChevronLeft, Mail } from 'lucide-react-native';
import AuthLayout from '../../components/Layout/AuthLayout';
import AuthInput from '../../components/Input/AuthInput';
import PrimaryButton from '../../components/Button/PrimaryButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;

const EmailVerificationScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');

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
        <Text className="text-3xl text-white font-bold tracking-tight mb-4">Email Verification</Text>
        <Text className="text-textSecondary text-center text-sm leading-5 px-4">
          Enter the input data carefully and create your account, enjoy cheerleading game
        </Text>
      </View>

      {/* Form Input */}
      <View className="px-6 mb-2">
        <AuthInput
          placeholder="Enter Email"
          value={email}
          onChangeText={setEmail}
          leftIcon={<Mail color="#A3A3A3" size={20} />}
          keyboardType="email-address"
        />
      </View>

      {/* Spacer to push button to bottom */}
      <View className="flex-1 min-h-[60px]" />

      {/* Bottom Actions */}
      <View className="px-6 pb-6">
        <PrimaryButton 
          title="Send OTP" 
          onPress={() => navigation.navigate('OTPVerification')}
        />
      </View>
    </AuthLayout>
  );
};

export default EmailVerificationScreen;
