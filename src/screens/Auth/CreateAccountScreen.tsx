import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChevronLeft, User, Mail, Calendar, KeyRound, Check } from 'lucide-react-native';
import DatePicker from 'react-native-date-picker';
import AuthLayout from '../../components/Layout/AuthLayout';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import AuthInput from '../../components/Input/AuthInput';
import PrimaryButton from '../../components/Button/PrimaryButton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateAccount'>;

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
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

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', message: '', type: 'error' });
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [isCalendarVisible, setCalendarVisible] = useState(false);

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

  const onSubmit = (data: SignUpFormValues) => {
    console.log('Create account pressed', data);
    dispatch(updateUser({ email: data.email, name: data.name, dateOfBirth: data.dateOfBirth }));
    showToast('Success', 'Account created successfully!', 'success');
    navigation.navigate('CreateUsername' as never);
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
            name="dateOfBirth"
            render={({ field: { onChange, value } }) => (
              <View className="mb-4">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCalendarVisible(true)}
                  className={`flex-row items-center bg-black border ${errors.dateOfBirth ? 'border-red-500' : 'border-[#3A144E]'} rounded-xl px-4 py-4`}
                >
                  <View className="mr-3 opacity-60"><Calendar color="#A3A3A3" size={20} /></View>
                  <Text className={`flex-1 text-base ${value ? 'text-white' : 'text-[#666666]'}`}>
                    {value || 'Date of birth'}
                  </Text>
                </TouchableOpacity>
                {!!errors.dateOfBirth && (
                  <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 4, marginLeft: 4 }}>
                    {errors.dateOfBirth.message}
                  </Text>
                )}
                
                <DatePicker
                  modal
                  open={isCalendarVisible}
                  date={value ? new Date(value) : new Date(2000, 0, 1)}
                  mode="date"
                  maximumDate={new Date()}
                  theme="dark"
                  onConfirm={(date) => {
                    setCalendarVisible(false);
                    const dateStr = date.toISOString().split('T')[0];
                    onChange(dateStr);
                  }}
                  onCancel={() => {
                    setCalendarVisible(false);
                  }}
                />
              </View>
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
        <View className="px-6 my-6">
          <View className="flex-row items-center">
            <View className="flex-1 h-[1px] bg-[#3A144E]" />
            <Text className="text-[#FFB444] text-xs px-3 font-medium">SignUp with Others</Text>
            <View className="flex-1 h-[1px] bg-[#3A144E]" />
          </View>

          <View className="flex-row justify-center mt-6 gap-x-4">
            {/* Google Icon Placeholder using Text since Lucide doesn't have it natively */}
            <TouchableOpacity className="w-12 h-12 rounded-full border border-[#3A144E] items-center justify-center">
              <Text className="text-white font-bold text-xl">G</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-12 h-12 rounded-full border border-[#3A144E] items-center justify-center">
              <Text className="text-white font-bold text-xl"></Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-12 h-12 rounded-full border border-[#3A144E] items-center justify-center">
              <Text className="text-white font-bold text-xl">f</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-12 h-12 rounded-full border border-[#3A144E] items-center justify-center">
              <Text className="text-white font-bold text-xl">X</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-12 h-12 rounded-full border border-[#3A144E] items-center justify-center">
              <Text className="text-white font-bold text-xl">In</Text>
            </TouchableOpacity>
          </View>
        </View>

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
            title="Register"
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

