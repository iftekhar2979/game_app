import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  FileText,
  Headset,
  LogOut,
  Trash2,
  Trophy,
  Bell,
  KeyRound,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from '../../services/authService';
import { RootState } from '../../store';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isAdmin = useSelector(
    (state: RootState) => state.auth.user?.role === 'admin',
  );
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
          <Text className="text-white text-[20px] font-semibold mt-3">
            Settings
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Menu Items */}
          <TouchableOpacity
            className="flex-row items-center justify-between bg-[#1A1A1A] rounded-[16px] px-5 py-4 mb-3"
            onPress={() => navigation.navigate('Notification' as never)}
          >
            <View className="flex-row items-center">
              <Bell color="#8B3DFF" size={20} className="mr-4" />
              <Text className="text-white text-[14px]">Notifications</Text>
            </View>
            <ChevronRight color="#fff" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between bg-[#1A1A1A] rounded-[16px] px-5 py-4 mb-3"
            onPress={() => navigation.navigate('ChangePassword' as never)}
          >
            <View className="flex-row items-center">
              <KeyRound color="#fff" size={20} className="mr-4" />
              <Text className="text-white text-[14px]">Change Password</Text>
            </View>
            <ChevronRight color="#fff" size={20} />
          </TouchableOpacity>

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
              <Text className="text-white text-[14px]">Terms & Conditions</Text>
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

          {isAdmin && (
            <TouchableOpacity
              className="flex-row items-center justify-between bg-[#2B2112] border border-[#E0B566]/40 rounded-[16px] px-5 py-4 mb-3"
              onPress={() => navigation.navigate('AdminCheer' as never)}
            >
              <View className="flex-row items-center">
                <Trophy color="#E0B566" size={20} className="mr-4" />
                <Text className="text-white text-[14px]">Cheer Operations</Text>
              </View>
              <ChevronRight color="#E0B566" size={20} />
            </TouchableOpacity>
          )}

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

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        {/* Tapping outside cancels - the same escape the Cancel button gives. */}
        <TouchableOpacity
          className="flex-1 justify-center items-center px-6"
          activeOpacity={1}
          onPress={() => setIsLogoutModalVisible(false)}
        >
          <View className="absolute inset-0 bg-black/80" />

          <TouchableOpacity
            activeOpacity={1}
            className="w-full max-w-[400px] bg-[#140A24] rounded-[28px] px-7 pt-8 pb-7 items-center border border-[#3A144E]"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.5,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            {/* Destructive actions read better with a visual anchor than with
                title text alone. */}
            <View className="w-[68px] h-[68px] rounded-full bg-[#2A0F1A] border border-[#5A1F2B] items-center justify-center mb-5">
              <LogOut color="#FF6B6B" size={28} />
            </View>

            <Text className="text-white text-[22px] font-bold mb-2.5">
              Log out?
            </Text>
            <Text className="text-[#A79BB8] text-[14px] text-center leading-[21px] mb-7">
              You'll be signed out of CheerBattle on this device. Your leagues,
              coins and progress stay safe — just sign back in to pick up where
              you left off.
            </Text>

            <View className="w-full">
              <TouchableOpacity
                className="w-full bg-[#D32F2F] py-3.5 rounded-full items-center mb-3"
                activeOpacity={0.85}
                onPress={() => {
                  setIsLogoutModalVisible(false);
                  authService.handleLogout(dispatch);
                }}
              >
                <Text className="text-white font-bold text-[15px]">Log out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full py-3.5 rounded-full items-center border border-[#3A144E]"
                activeOpacity={0.85}
                onPress={() => setIsLogoutModalVisible(false)}
              >
                <Text className="text-[#C9B8E0] font-semibold text-[15px]">
                  Stay signed in
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
