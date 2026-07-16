import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthLayout from '../../components/Layout/AuthLayout';
import { ChevronLeft, User } from 'lucide-react-native';

export default function CreateUsernameScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');

  const handleNext = () => {
    // Navigate to OTP Verification screen
    navigation.navigate('OTPVerification' as never);
  };

  return (
    <AuthLayout scrollable={false}>
      <View className="flex-1">
        {/* Header Back Button */}
        <View className="px-6 mt-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 border border-white/20 rounded-xl items-center justify-center bg-black/40"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Title and Subtitle */}
        <View className="px-6 mt-8 items-center">
          <Text className="text-3xl text-white font-bold tracking-tight mb-3">Create username</Text>
          <Text className="text-gray-400 text-center text-[13px] leading-5 px-4 mb-10">
            Added a user name and the user name will showing into the app for your identity
          </Text>
        </View>

        {/* Input Field */}
        <View className="px-6">
          <Text className="text-gray-300 text-sm mb-2 ml-1">Add user name</Text>
          <View className="flex-row items-center border border-[#5B1F7D] rounded-[16px] px-4 py-3 bg-black/30">
            <User color="#6B7280" size={18} className="mr-3" />
            <TextInput
              className="flex-1 text-white text-base py-1"
              placeholder="Ex: @davidthomas"
              placeholderTextColor="#6B7280"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Spacer to push button to bottom */}
        <View className="flex-1" />

        {/* Bottom Button */}
        <View className="px-6 pb-10">
          <TouchableOpacity
            onPress={handleNext}
            className={`w-full py-4 rounded-full items-center justify-center ${
              username.length > 0 ? 'bg-[#7E22CE]' : 'bg-[#7E22CE]/70'
            }`}
            disabled={username.length === 0}
          >
            <Text className="text-white text-[16px] font-semibold">Add user name</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
}
