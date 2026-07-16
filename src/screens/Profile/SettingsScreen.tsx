import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, User, Shield, FileText, Headset, LogOut, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  return (
    <>
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-center px-6 pt-2 pb-8 relative">
        <TouchableOpacity
          className="absolute left-6 top-2 w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-transparent z-10"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold mt-3">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Menu Items */}
        <TouchableOpacity
          className="flex-row items-center justify-between bg-[#1A1A1A] rounded-[16px] px-5 py-4 mb-3"
          onPress={() => navigation.navigate('AboutUs' as never)}
        >
          <View className="flex-row items-center">
            <User color="#fff" size={20} className="mr-4" />
            <Text className="text-white text-[14px]">About Us</Text>
          </View>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center justify-between bg-[#1A1A1A] rounded-[16px] px-5 py-4 mb-3"
          onPress={() => navigation.navigate('PrivacyPolicy' as never)}
        >
          <View className="flex-row items-center">
            <Shield color="#fff" size={20} className="mr-4" />
            <Text className="text-white text-[14px]">Privacy Policy</Text>
          </View>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center justify-between bg-[#1A1A1A] rounded-[16px] px-5 py-4 mb-3"
          onPress={() => navigation.navigate('TermsOfService' as never)}
        >
          <View className="flex-row items-center">
            <FileText color="#fff" size={20} className="mr-4" />
            <Text className="text-white text-[14px]">Terms of Service</Text>
          </View>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center justify-between bg-[#1A1A1A] rounded-[16px] px-5 py-4 mb-3"
          onPress={() => navigation.navigate('AdminSupport' as never)}
        >
          <View className="flex-row items-center">
            <Headset color="#fff" size={20} className="mr-4" />
            <Text className="text-white text-[14px]">Admin Support</Text>
          </View>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          className="flex-row items-center justify-between bg-[#8B0000] rounded-[16px] px-5 py-4 mt-2"
          onPress={() => setIsLogoutModalVisible(true)}
        >
          <View className="flex-row items-center">
            <LogOut color="#fff" size={20} className="mr-4" />
            <Text className="text-white text-[14px]">Logout</Text>
          </View>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>

      </ScrollView>

      {/* Delete Account Button */}
      <View className="absolute bottom-[40px] left-6 right-6">
        <TouchableOpacity className="flex-row justify-center items-center border border-[#8B0000] rounded-[16px] py-4 bg-transparent">
          <Trash2 color="#ff4444" size={18} className="mr-2" />
          <Text className="text-[#ff4444] text-[14px]">Delete account</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>

      {/* Logout Modal */ }
  <Modal
    animationType="fade"
    transparent={true}
    visible={isLogoutModalVisible}
    onRequestClose={() => setIsLogoutModalVisible(false)}
  >
    <View className="flex-1 justify-center items-center px-6">
      {/* Semi-transparent dark overlay */}
      <View className="absolute inset-0 bg-black/70" />

      {/* Modal Content */}
      <View className="w-full bg-white/10 rounded-[24px] p-6 items-center border border-white/20 shadow-2xl backdrop-blur-md">
        <Text className="text-white text-[24px] font-semibold mb-4">Logout</Text>
        <Text className="text-gray-300 text-[14px] text-center leading-5 mb-8">
          Are you want to sure logout now. If you logout now your all progress will be stop.
        </Text>

        <View className="flex-row justify-between w-full px-4">
          <TouchableOpacity
            className="flex-1 border border-gray-400 py-3 rounded-full mr-2 items-center"
            onPress={() => setIsLogoutModalVisible(false)}
          >
            <Text className="text-gray-300 font-medium">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-[#D32F2F] py-3 rounded-full ml-2 items-center shadow-md shadow-red-900/50"
            onPress={() => {
              setIsLogoutModalVisible(false);
              // Handle actual logout logic here later
            }}
          >
            <Text className="text-white font-medium">Yes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>

    </>
  );
}
