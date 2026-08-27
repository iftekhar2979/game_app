import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChevronLeft } from 'lucide-react-native';
import AuthLayout from '../../components/Layout/AuthLayout';
import OTPInput from '../../components/Input/OTPInput';
import PrimaryButton from '../../components/Button/PrimaryButton';
import {
  useForgotPasswordMutation,
  useVerifyEmailMutation,
} from '../../store/api/authApi';
import { showToast } from '../../utils/toast';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setResetPasswordToken, startPasswordReset } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OTPVerification'>;

const OTPVerificationScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const { pendingAuthFlow, pendingEmail } = useSelector((state: RootState) => state.auth);
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(83); // 01:23 = 83 seconds
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [forgotPassword, { isLoading: isResendingReset }] = useForgotPasswordMutation();
  const isPasswordReset = pendingAuthFlow === 'passwordReset';

  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const intervalId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} s`;
  };

  const handleResend = async () => {
    if (timeLeft === 0 && !isResendingReset) {
      try {
        if (isPasswordReset) {
          if (!pendingEmail) throw new Error('The reset email is missing.');
          const response = await forgotPassword({ email: pendingEmail }).unwrap();
          const token = response.data?.accessToken;
          if (!token) throw new Error('Could not create a new reset session.');
          dispatch(startPasswordReset({ email: pendingEmail, token }));
        } else {
          // The API regenerates an unverified account's code on login; it does
          // not expose a separate resend endpoint for registration sessions.
          await authService.handleLogout(dispatch as any);
          showToast.info('Sign in again', 'Signing in will send a new verification code.');
          return;
        }
        setTimeLeft(83);
        showToast.success('Success', 'A new verification code has been sent to your email.');
      } catch (error: any) {
        showToast.error('Error', error?.data?.message || 'Failed to resend verification code');
      }
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <View className="px-6 mb-10 mt-2">
        <TouchableOpacity 
          onPress={() => authService.handleLogout(dispatch as any)}
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Title & Subtitle */}
      <View className="px-6 items-center mb-10 mt-10">
        <Text className="text-3xl text-white font-bold tracking-tight mb-4">Verification code</Text>
        <Text className="text-textSecondary text-center text-sm leading-5 px-4">
          Enter the 6-digit code sent to {pendingEmail || 'your email'}.
        </Text>
      </View>

      {/* OTP Input */}
      <View className="px-6 mb-8 mt-2">
        <OTPInput value={otp} onChange={setOtp} length={6} />
      </View>

      {/* Resend Timer */}
      <View className="px-6 flex-row justify-between items-center">
        <Text className="text-white text-sm">Didn't get the code?</Text>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleResend} disabled={timeLeft > 0 || isResendingReset}>
            <Text className={`text-sm font-medium ${timeLeft > 0 ? 'text-[#FF4A4A]/80' : 'text-[#FF4A4A]'}`}>
              {timeLeft > 0 ? 'Resend in' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
          {timeLeft > 0 && (
            <Text className="text-white text-sm ml-1 font-medium">
              {formatTime(timeLeft)}
            </Text>
          )}
        </View>
      </View>

      {/* Spacer */}
      <View className="flex-1 min-h-[60px]" />

      {/* Bottom Actions */}
      <View className="px-6 pb-6">
        <PrimaryButton 
          title={isLoading ? "Verifying..." : "Verify"} 
          disabled={isLoading || otp.length < 6}
          onPress={async () => {
            try {
              const response = await verifyEmail({ code: otp }).unwrap();
              if (isPasswordReset) {
                const resetToken = response.data?.resetPasswordToken;
                if (!resetToken) {
                  throw new Error('The server did not return a password reset token.');
                }
                dispatch(setResetPasswordToken(resetToken));
                navigation.replace('ResetPassword');
              } else {
                await authService.handleEmailVerified(dispatch as any);
              }
            } catch (error: any) {
              showToast.error(
                'Verification failed',
                error?.data?.message || error?.message || 'Invalid or expired verification code',
              );
            }
          }}
        />
      </View>
    </AuthLayout>
  );
};

export default OTPVerificationScreen;
