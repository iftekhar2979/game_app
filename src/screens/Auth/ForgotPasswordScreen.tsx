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
import {
  isValidEmail,
  normaliseEmail,
  resolveForgotPasswordOutcome,
} from './forgotPassword';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  /**
   * Kept on the screen rather than only in a toast.
   *
   * A toast fades, and the screen behind it has not changed - which is exactly
   * how this looked broken: enter an email, see a message for three seconds,
   * end up staring at the same form with no idea what happened.
   */
  const [notice, setNotice] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const normalisedEmail = normaliseEmail(email);

  const handleSendCode = async () => {
    if (!isValidEmail(email)) {
      setNotice('Enter the email address used for your account.');
      return;
    }

    setNotice('');

    try {
      const response = await forgotPassword({ email: normalisedEmail }).unwrap();
      const outcome = resolveForgotPasswordOutcome(response);

      if (outcome.kind === 'no-account') {
        // No reset session, so there is nothing an OTP screen could verify.
        // Saying so beats sending the user on to a code that can never work.
        setNotice(
          `We could not find an account for ${normalisedEmail}. Check the address, or create an account.`,
        );
        return;
      }

      showToast.success('Code sent', 'Enter the verification code from your email.');
      // Swapping the navigator's screen list is what moves the user on: see
      // the comment in App.tsx. Nothing here navigates directly.
      dispatch(startPasswordReset({ email: normalisedEmail, token: outcome.token }));
    } catch (error: any) {
      setNotice(
        error?.data?.message || 'Could not send the code. Please try again in a moment.',
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
          onChangeText={(value: string) => {
            setEmail(value);
            // Clear on edit: a message about the previous address is worse than
            // none once it is being corrected.
            if (notice) setNotice('');
          }}
          leftIcon={<Mail color="#A3A3A3" size={20} />}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {notice ? (
        <View className="px-6 mt-2">
          <Text className="text-[#FF8A8A] text-[13px] leading-5">{notice}</Text>
        </View>
      ) : null}

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
