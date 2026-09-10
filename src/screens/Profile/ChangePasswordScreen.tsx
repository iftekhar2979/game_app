import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, EyeOff, Info } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useChangePasswordMutation } from '../../store/api/authApi';
import { showToast } from '../../utils/toast';
import { haptic } from '../../feedback/feedback';
import {
  ChangePasswordErrors,
  ChangePasswordValues,
  MIN_PASSWORD_LENGTH,
  changePasswordErrorMessage,
  hasErrors,
  isSocialOnlyAccountError,
  isWrongCurrentPasswordError,
  validateChangePassword,
} from './changePassword';

const EMPTY: ChangePasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [values, setValues] = useState<ChangePasswordValues>(EMPTY);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [socialOnly, setSocialOnly] = useState(false);

  const update = (field: keyof ChangePasswordValues) => (text: string) => {
    const next = { ...values, [field]: text };
    setValues(next);
    // Re-validate as they type only after a first attempt, so errors do not
    // appear on a field the reader has not finished yet.
    if (submitted) setErrors(validateChangePassword(next));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    const found = validateChangePassword(values);
    setErrors(found);
    if (hasErrors(found)) {
      haptic('soft');
      return;
    }

    try {
      await changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();

      haptic('impactLight');
      showToast.success('Password changed', 'Use your new password next time you sign in.');
      navigation.goBack();
    } catch (error) {
      if (isSocialOnlyAccountError(error)) {
        setSocialOnly(true);
        return;
      }
      if (isWrongCurrentPasswordError(error)) {
        setErrors({ currentPassword: changePasswordErrorMessage(error) });
        return;
      }
      showToast.error('Password not changed', changePasswordErrorMessage(error));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-center px-6 pt-2 pb-6 relative">
        <TouchableOpacity
          className="absolute left-6 top-2 w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-transparent z-10"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold mt-3">Change password</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {socialOnly ? (
            <View className="flex-row bg-[#1a1428] border border-[#8B3DFF]/50 rounded-2xl p-4 mb-6">
              <Info color="#B995F5" size={18} />
              <Text className="text-gray-200 text-[13px] leading-5 ml-3 flex-1">
                You signed up with Google, Apple or Facebook, so this account does not
                have a password yet. To create one, sign out and choose "Forgot
                password" on the sign-in screen.
              </Text>
            </View>
          ) : null}

          <PasswordField
            label="Current password"
            value={values.currentPassword}
            onChangeText={update('currentPassword')}
            error={errors.currentPassword}
            textContentType="password"
            autoComplete="password"
          />
          <PasswordField
            label="New password"
            value={values.newPassword}
            onChangeText={update('newPassword')}
            error={errors.newPassword}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            textContentType="newPassword"
            autoComplete="password-new"
          />
          <PasswordField
            label="Confirm new password"
            value={values.confirmPassword}
            onChangeText={update('confirmPassword')}
            error={errors.confirmPassword}
            textContentType="newPassword"
            autoComplete="password-new"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            className={`mt-4 rounded-2xl py-4 items-center ${isLoading ? 'bg-[#8B3DFF]/60' : 'bg-[#8B3DFF]'}`}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-[15px] font-semibold">Update password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  error,
  hint,
  textContentType,
  autoComplete,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  hint?: string;
  textContentType: 'password' | 'newPassword';
  autoComplete: 'password' | 'password-new';
  onSubmitEditing?: () => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-5">
      <Text className="text-gray-300 text-[13px] font-medium mb-2">{label}</Text>
      <View
        className={`flex-row items-center bg-[#141414] rounded-xl border px-4 ${error ? 'border-red-500/70' : 'border-[#2a2a2a]'}`}
      >
        <TextInput
          className="flex-1 text-white text-[15px] py-3.5"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={textContentType}
          autoComplete={autoComplete}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          onPress={() => setVisible((shown) => !shown)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff color="#888" size={18} /> : <Eye color="#888" size={18} />}
        </TouchableOpacity>
      </View>
      {error ? (
        <Text className="text-red-400 text-[12px] mt-1.5">{error}</Text>
      ) : hint ? (
        <Text className="text-gray-500 text-[12px] mt-1.5">{hint}</Text>
      ) : null}
    </View>
  );
}
