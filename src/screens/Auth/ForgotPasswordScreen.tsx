import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../../App';
import AuthLayout from '../../components/Layout/AuthLayout';
import AuthInput from '../../components/Input/AuthInput';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { useForgotPasswordMutation } from '../../store/api/authApi';
import { startPasswordReset } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const normalisedEmail = email.trim().toLowerCase();
  const isValidEmail = /^\S+@\S+\.\S+$/.test(normalisedEmail);

  const handleSendCode = async () => {
    if (!isValidEmail) {
      showToast.error('Invalid email', 'Enter the email address used for your account.');
      return;
    }

    try {
      const response = await forgotPassword({ email: normalisedEmail }).unwrap();
      const token = response.data?.accessToken;

      if (!token) {
        showToast.info('Check your email', response.message);
        return;
      }

      showToast.success('Code sent', 'Enter the verification code from your email.');
      dispatch(startPasswordReset({ email: normalisedEmail, token }));
    } catch (error: any) {
      showToast.error(
        'Could not send code',
        error?.data?.message || 'Please try again in a moment.',
      );
    }
  };

  return (
    <AuthLayout>
      <View className="px-6 mb-10 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
      </View>

      <View className="px-6 items-center mb-10 mt-10">
        <Text className="text-3xl text-white font-bold tracking-tight mb-4">Forgot password</Text>
        <Text className="text-textSecondary text-center text-sm leading-5 px-4">
          Enter your account email and we will send you a verification code.
        </Text>
      </View>

      <View className="px-6 mb-2">
        <AuthInput
          placeholder="Enter Email"
          value={email}
          onChangeText={setEmail}
          leftIcon={<Mail color="#A3A3A3" size={20} />}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View className="flex-1 min-h-[60px]" />

      <View className="px-6 pb-6">
        <PrimaryButton
          title={isLoading ? 'Sending...' : 'Send verification code'}
          disabled={isLoading}
          onPress={handleSendCode}
        />
      </View>
    </AuthLayout>
  );
}
