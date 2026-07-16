import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MessageSquare, Phone, Mail } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function AdminSupportScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-center px-6 pt-2 pb-8 relative">
        <TouchableOpacity 
          className="absolute left-6 top-2 w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-transparent z-10"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold mt-3">Admin support</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 50, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* Placeholder for Speech Bubbles Graphic */}
        <View className="items-center justify-center py-16 flex-1">
          <View className="relative">
            {/* Background offset bubble */}
            <View className="absolute -left-6 -top-4 bg-white/90 p-6 rounded-[24px] rounded-br-none rotate-[-10deg]">
               <MessageSquare color="#111" size={60} fill="#111" />
            </View>
            {/* Foreground orange bubble */}
            <View className="bg-[#FFB84D] p-8 rounded-[32px] rounded-bl-none z-10 shadow-lg">
               <MessageSquare color="#fff" size={80} fill="#fff" />
            </View>
          </View>
        </View>

        {/* Contact Card */}
        <View className="border border-[#FFB84D] rounded-[16px] p-5 mt-auto mb-10">
          <Text className="text-[#FFB84D] text-[13px] text-center leading-5 mb-5 px-2">
            If you have any questions, need assistance, or want to discuss your progress, feel free to reach out to your coach. We're here to help you achieve your fitness goals!
          </Text>
          
          <View className="bg-[#FFB84D] rounded-[12px] py-4 px-6 items-center">
            <View className="flex-row items-center mb-2">
              <View className="bg-white/20 p-1.5 rounded-full mr-3">
                <Phone color="#000" size={14} />
              </View>
              <Text className="text-black text-[14px] font-semibold">1808327-7892</Text>
            </View>
            <View className="flex-row items-center">
              <View className="bg-white/20 p-1.5 rounded-full mr-3">
                <Mail color="#000" size={14} />
              </View>
              <Text className="text-black text-[14px] font-semibold">abc@gmail.com</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
