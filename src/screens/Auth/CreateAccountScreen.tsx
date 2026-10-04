import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChevronLeft, User, Mail, KeyRound, Check } from 'lucide-react-native';
import AuthLayout from '../../components/Layout/AuthLayout';
import { useDispatch } from 'react-redux';
import AuthInput from '../../components/Input/AuthInput';
import SocialAuthButtons from '../../components/Auth/SocialAuthButtons';
import BirthDateGate from '../../components/Auth/BirthDateGate';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegisterMutation } from '../../store/api/authApi';
import { authService } from '../../services/authService';
import { canCreateAccount } from '../../utils/ageGate';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateAccount'>;

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().refine(canCreateAccount, 'A parent or guardian must complete account setup for younger players'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  terms: z.boolean().refine((val) => val === true, 'You must agree to the Terms of Services & Privacy Policy'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

const CreateAccountScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const [agreed, setAgreed] = useState(false);
  const [ageVerifiedDate, setAgeVerifiedDate] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', message: '', type: 'error' });
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const showToast = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setToastMessage({ title, message, type });
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const { control, handleSubmit, formState: { errors }, setValue, trigger } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const [register, { isLoading }] = useRegisterMutation();

  const onSubmit = async (data: SignUpFormValues) => {
    if (!ageVerifiedDate || data.dateOfBirth !== ageVerifiedDate || !canCreateAccount(data.dateOfBirth)) {
      return;
    }
    try {
      const response = await register({
        fullName: data.name,
        email: data.email,
        password: data.password,
        dateOfBirth: data.dateOfBirth,
        isTcPpAccepted: data.terms,
      }).unwrap();

      const token = response?.data?.accessToken;
      if (!token) {
        throw new Error('The server did not return a verification session.');
      }

      await authService.handleVerificationRequired(dispatch as any, token, {
        email: data.email,
        fullName: data.name,
        dateOfBirth: data.dateOfBirth,
      });
    } catch (error: any) {
      console.error('Registration failed full error:', JSON.stringify(error, null, 2));
      showToast('Error', error?.data?.message || error?.error || 'Failed to create account', 'error');
    }
  };

  const handleTermsToggle = () => {
    const newValue = !agreed;
    setAgreed(newValue);
    setValue('terms', newValue);
    trigger('terms');
  };

  return (
    <AuthLayout>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-6 mb-8 mt-2">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Title & Subtitle */}
        <View className="px-6 items-center mb-8">
          <Text className="text-3xl text-white font-bold tracking-tight mb-4">Create account</Text>
          <Text className="text-[#A3A3A3] text-center text-sm leading-5 px-4">
            Enter the input data carefully and create your account, enjoy cheerleading game
          </Text>
        </View>

        {!ageVerifiedDate ? (
          <BirthDateGate onEligible={date => {
            setValue('dateOfBirth', date, { shouldValidate: true });
            setAgeVerifiedDate(date);
          }} />
        ) : <>
        {/* Form Inputs */}
        <View className="px-6 mb-2">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthInput
                placeholder="Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                leftIcon={<User color="#A3A3A3" size={20} />}
                error={errors.name?.message}
              />
            )}
          />

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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthInput
                placeholder="Confirm Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                leftIcon={<KeyRound color="#A3A3A3" size={20} />}
                isPassword
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </View>

        {/* SignUp with Others */}
        <SocialAuthButtons
          label="SignUp with Others"
          isTcPpAccepted={agreed}
          dateOfBirth={ageVerifiedDate}
          requireTermsAcceptance
          disabled={isLoading}
          onError={(title, message) => showToast(title, message, 'error')}
        />

        {/* Checkbox */}
        <View className="px-6 mb-6">
          <TouchableOpacity className="flex-row items-center" onPress={handleTermsToggle} activeOpacity={0.8}>
            <View className={`w-5 h-5 rounded-[4px] border items-center justify-center mr-3 ${agreed ? 'bg-[#FFB444] border-[#FFB444]' : 'border-[#3A144E] bg-transparent'}`}>
              {agreed && <Check color="black" size={14} />}
            </View>
            <Text className="text-white text-sm">
              Agree with <Text className="text-[#FFB444] underline">Terms of Services</Text> & <Text className="text-[#FFB444] underline">Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms && <Text className="text-red-500 text-sm mt-2 ml-1">{errors.terms.message}</Text>}
        </View>

        {/* Spacer to push button to bottom if screen is small */}
        <View className="flex-1 min-h-[20px]" />

        {/* Bottom Actions */}
        <View className="px-6 pb-8">
          <PrimaryButton
            title={isLoading ? "Registering..." : "Register"}
            disabled={isLoading}
            onPress={handleSubmit(onSubmit, (errors) => {
              console.log('Validation errors:', errors);
              showToast('Validation Error', 'Please check the form inputs.', 'error');
            })}
          />

          <View className="flex-row justify-center mt-6">
            <Text className="text-textSecondary text-sm">Have an account ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text className="text-[#FFB444] text-sm underline font-medium">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
        </>}
      </ScrollView>

      {/* Animated Validation Toast */}
      {toastVisible && (
        <Animated.View
          style={{
            opacity: fadeAnim,
            position: 'absolute',
            top: 60,
            left: 24,
            right: 24,
            backgroundColor: toastMessage.type === 'error' ? '#ef4444' : '#22c55e',
            padding: 16,
            borderRadius: 12,
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text className="text-white font-bold text-base">{toastMessage.title}</Text>
          {!!toastMessage.message && (
            <Text className="text-white text-sm mt-1">{toastMessage.message}</Text>
          )}
        </Animated.View>
      )}
    </AuthLayout>
  );
};

export default CreateAccountScreen;
