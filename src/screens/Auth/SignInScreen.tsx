import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChevronLeft, Mail, KeyRound } from 'lucide-react-native';
import AuthLayout from '../../components/Layout/AuthLayout';
import AuthInput from '../../components/Input/AuthInput';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

const SignInScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const { control, handleSubmit, formState: { errors } } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: SignInFormValues) => {
    console.log('Sign in pressed', data);
    navigation.navigate('Home')
    // Dispatch RTK action here
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
        <Text className="text-3xl text-white font-bold tracking-tight mb-4">Sign in</Text>
        <Text className="text-textSecondary text-center text-sm leading-5 px-4">
          Enter your email and password, sign in into the app
        </Text>
      </View>

      {/* Form Inputs */}
      <View className="px-6 mb-2">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              placeholder="Enter Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              leftIcon={<Mail color="#A3A3A3" size={20} />}
              keyboardType="email-address"
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              placeholder="Enter Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              leftIcon={<KeyRound color="#A3A3A3" size={20} />}
              isPassword
              error={errors.password?.message}
            />
          )}
        />

        <TouchableOpacity
          className="items-end mt-2"
          onPress={() => navigation.navigate('EmailVerification')}
        >
          <Text className="text-[#FFB444] font-medium text-sm">Forgot Password</Text>
        </TouchableOpacity>
      </View>

      {/* Spacer to push button to bottom */}
      <View className="flex-1 min-h-[60px]" />

      {/* Bottom Actions */}
      <View className="px-6 pb-6">
        <PrimaryButton
          title="Sign in"
          onPress={handleSubmit(onSubmit, (errors) => {
            console.log('Validation errors:', errors);
            Alert.alert('Validation Error', 'Please check the form inputs.');
          })}
        />

        <View className="flex-row justify-center mt-6">
          <Text className="text-textSecondary text-sm">Don't have an account ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
            <Text className="text-[#FFB444] text-sm underline font-medium">Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
};

export default SignInScreen;
