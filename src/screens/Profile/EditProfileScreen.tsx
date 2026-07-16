import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ImageBackground, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Settings, Edit2, User, MapPin, Users, ChevronDown, Home } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const avatars = useSelector((state: RootState) => state.avatar.savedAvatars);
  const userAvatarUri = avatars.length > 0 ? avatars[0].imageUri : 'https://i.pravatar.cc/150?img=11';

  return (
    <View className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View className="relative w-full h-[240px]">
          <ImageBackground 
            source={require('../../assets/images/utils/image 75.png')} 
            className="w-full h-full rounded-b-[40px] overflow-hidden"
          >
            <View className="absolute inset-0 bg-black/20" />
            
            {/* Header Buttons over Banner */}
            <SafeAreaView edges={['top']} className="absolute top-0 w-full flex-row justify-between px-5 pt-2">
              <TouchableOpacity 
                className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
                onPress={() => navigation.goBack()}
              >
                <ChevronLeft color="#fff" size={24} />
              </TouchableOpacity>
              <TouchableOpacity 
                className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
              >
                <Settings color="#fff" size={20} />
              </TouchableOpacity>
            </SafeAreaView>

            {/* Title */}
            <View className="absolute top-[80px] w-full items-center">
              <Text className="text-white text-[20px] font-semibold">Edit profile</Text>
            </View>
          </ImageBackground>

          {/* Avatar over the Banner edge */}
          <View className="absolute -bottom-[60px] left-1/2 -ml-[60px] items-center justify-center z-10">
            <View className="w-[120px] h-[120px] rounded-full border-[4px] border-black overflow-hidden relative">
              <Image source={{ uri: userAvatarUri }} className="w-full h-full" />
            </View>
            <TouchableOpacity className="absolute bottom-1 right-2 w-8 h-8 bg-black rounded-full justify-center items-center border-[2px] border-[#FFB84D]">
              <Edit2 color="#FFB84D" size={12} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer for avatar overlap */}
        <View className="h-[80px]" />

        {/* Form Inputs */}
        <View className="px-5 flex-1">
          {/* Name Input */}
          <View className="flex-row items-center border border-[#6B21A8] rounded-[16px] px-4 py-3.5 mb-4 bg-transparent">
            <User color="#999" size={20} className="mr-3" />
            <TextInput 
              className="flex-1 text-white text-[15px] p-0 m-0"
              placeholder="Name"
              placeholderTextColor="#666"
              defaultValue="David"
            />
          </View>

          {/* User Name Input */}
          <View className="flex-row items-center border border-[#6B21A8] rounded-[16px] px-4 py-3.5 mb-4 bg-transparent">
            <Edit2 color="#999" size={20} className="mr-3" />
            <TextInput 
              className="flex-1 text-white text-[15px] p-0 m-0"
              placeholder="User name"
              placeholderTextColor="#666"
              defaultValue="thomas097"
            />
          </View>

          {/* State Input */}
          <TouchableOpacity className="flex-row items-center border border-[#6B21A8] rounded-[16px] px-4 py-3.5 mb-4 bg-transparent">
            <Home color="#999" size={20} className="mr-3" />
            <Text className="flex-1 text-white text-[15px]">Select your state</Text>
            <MapPin color="#999" size={20} />
          </TouchableOpacity>

          {/* Cheer Program Input */}
          <TouchableOpacity className="flex-row items-center border border-[#6B21A8] rounded-[16px] px-4 py-3.5 mb-4 bg-transparent">
            <Users color="#999" size={20} className="mr-3" />
            <Text className="flex-1 text-white text-[15px]">Select favorite cheer program</Text>
            <ChevronDown color="#999" size={20} />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <View className="px-5 mt-auto pt-8">
          <TouchableOpacity 
            className="w-full bg-[#8B3DFF] py-4 rounded-[24px] items-center"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white text-[16px] font-bold">Save changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
