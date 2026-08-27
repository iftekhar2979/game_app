import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChevronLeft, KeyRound } from 'lucide-react-native';
import AuthLayout from '../../components/Layout/AuthLayout';
import AuthInput from '../../components/Input/AuthInput';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useResetPasswordMutation } from '../../store/api/authApi';
import { logout } from '../../store/slices/authSlice';
import { authStorage } from '../../services/authStorage';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const resetPasswordToken = useSelector((state: RootState) => state.auth.resetPasswordToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      showToast.error('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast.error('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }
    if (!resetPasswordToken) {
      showToast.error('Reset session expired', 'Request a new verification code.');
      dispatch(logout());
      return;
    }

    try {
      const response = await resetPassword({ resetPasswordToken, newPassword }).unwrap();
      await authStorage.clearSession();
      dispatch(logout());
      showToast.success('Password changed', response.message || 'Sign in with your new password.');
    } catch (error: any) {
      showToast.error(
        'Could not change password',
        error?.data?.message || 'The reset session may have expired.',
      );
    }
  };

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
        <Text className="text-3xl text-white font-bold tracking-tight mb-4">Reset Password</Text>
        <Text className="text-textSecondary text-center text-sm leading-5 px-4">
          If reset password your previous password will be not working !
        </Text>
      </View>

      {/* Form Inputs */}
      <View className="px-6 mb-2">
        <AuthInput
          placeholder="Enter New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          leftIcon={<KeyRound color="#A3A3A3" size={20} />}
          isPassword
        />
        
        <AuthInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          leftIcon={<KeyRound color="#A3A3A3" size={20} />}
          isPassword
        />
      </View>

      {/* Spacer to push button to bottom */}
      <View className="flex-1 min-h-[60px]" />

      {/* Bottom Actions */}
      <View className="px-6 pb-6">
        <PrimaryButton 
          title={isLoading ? 'Changing password...' : 'Change password'}
          disabled={isLoading}
          onPress={handleResetPassword}
        />
      </View>
    </AuthLayout>
  );
};

export default ResetPasswordScreen;
