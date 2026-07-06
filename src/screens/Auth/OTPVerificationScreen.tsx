import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChevronLeft } from 'lucide-react-native';
import AuthLayout from '../../components/Layout/AuthLayout';
import OTPInput from '../../components/Input/OTPInput';
import PrimaryButton from '../../components/Button/PrimaryButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OTPVerification'>;

const OTPVerificationScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(83); // 01:23 = 83 seconds

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

  const handleResend = () => {
    if (timeLeft === 0) {
      setTimeLeft(83);
      // Trigger resend API logic here
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
        <Text className="text-3xl text-white font-bold tracking-tight mb-4">OTP Verification</Text>
        <Text className="text-textSecondary text-center text-sm leading-5 px-4">
          Enter the input data carefully and create your account, enjoy cheerleading game
        </Text>
      </View>

      {/* OTP Input */}
      <View className="px-6 mb-8 mt-2">
        <OTPInput value={otp} onChange={setOtp} length={6} />
      </View>

      {/* Resend Timer */}
      <View className="px-6 flex-row justify-between items-center">
        <Text className="text-white text-sm">Didn't got the code?</Text>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleResend} disabled={timeLeft > 0}>
            <Text className={`text-sm font-medium ${timeLeft > 0 ? 'text-[#FF4A4A]/80' : 'text-[#FF4A4A]'}`}>
              Resend in
            </Text>
          </TouchableOpacity>
          <Text className="text-white text-sm ml-1 font-medium">
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>

      {/* Spacer */}
      <View className="flex-1 min-h-[60px]" />

      {/* Bottom Actions */}
      <View className="px-6 pb-6">
        <PrimaryButton 
          title="Verify" 
          onPress={() => {
            console.log('Verify pressed with OTP:', otp);
            navigation.navigate('ResetPassword');
          }}
        />
      </View>
    </AuthLayout>
  );
};

export default OTPVerificationScreen;
