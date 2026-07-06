import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'GenerateAvatar'>;

const { width } = Dimensions.get('window');

const HAIR_STYLES = [1, 2, 3, 4, 5];
const HAIR_COLORS = [
  '#E6C27A', '#8D5B36', '#4A2F1D', '#1A1A1A', '#A33327', '#E6E6E6'
];
const BOWS = [1, 2, 3, 4, 5];

const GenerateAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [selectedHair, setSelectedHair] = useState<number | null>(null);
  const [selectedBody, setSelectedBody] = useState<number | null>(null);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View className="px-6 flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40 mr-4"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl text-[#B366FF] font-semibold tracking-wide">Generate avatar</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Large Avatar Preview */}
        <View className="px-6 mb-8">
          <View className="w-full h-[320px] rounded-3xl border border-[#5B1F7D] overflow-hidden bg-[#1A0B2E] items-center justify-end pt-4">
            {/* The glow effect behind avatar */}
            <View className="absolute top-10 w-48 h-48 rounded-full bg-[#B366FF] opacity-20 blur-3xl" />
            
            <View className="w-[90%] h-[95%] items-center justify-center">
              {/* Base Head */}
              <Image 
                source={require('../../assets/images/avatar/base/base_female-Photoroom.png')}
                className="absolute w-full h-full"
                resizeMode="contain"
              />
              
              {/* Layered Clothing (Blazer) */}
              {selectedBody !== null && (
                <Image 
                  source={require('../../assets/images/avatar/body/court.png')}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />
              )}

              {/* Layered Hair */}
              {selectedHair !== null && (
                <Image 
                  source={require('../../assets/images/avatar/hair/Hair.png')}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </View>

        {/* Customization Sections */}
        
        {/* Hair Style */}
        <View className="mb-6">
          <Text className="text-white text-base font-medium px-6 mb-4">Hair style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {HAIR_STYLES.map((_, index) => (
              <TouchableOpacity 
                key={`hair-${index}`} 
                activeOpacity={0.8} 
                className="mr-3 items-center"
                onPress={() => setSelectedHair(index)}
              >
                <View className="w-[72px] h-[90px] rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden justify-end pb-6">
                   <Image 
                      source={require('../../assets/images/avatar/hair/Hair.png')}
                      className="w-[120%] h-[120%] absolute top-[-10%] left-[-10%]"
                      resizeMode="cover"
                   />
                </View>
                {/* Price tag */}
                <View className="absolute bottom-0 bg-[#B366FF] px-2 py-1 rounded-full flex-row items-center border border-[#3A144E]">
                  <Text className="text-xs">🪙</Text>
                  <Text className="text-white text-[10px] font-bold ml-1">224</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Hair Color */}
        <View className="mb-6">
          <Text className="text-white text-base font-medium px-6 mb-4">Hair color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {HAIR_COLORS.map((color, index) => (
              <TouchableOpacity key={`color-${index}`} activeOpacity={0.8} className="mr-3 items-center">
                <View 
                  className="w-[60px] h-[60px] rounded-full border border-[#5B1F7D] mb-3"
                  style={{ backgroundColor: color }}
                />
                {/* Price tag */}
                <View className="absolute bottom-0 bg-[#B366FF] px-2 py-1 rounded-full flex-row items-center border border-[#3A144E]">
                  <Text className="text-xs">🪙</Text>
                  <Text className="text-white text-[10px] font-bold ml-1">224</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Blazer (Replacing Bows as requested) */}
        <View className="mb-6">
          <Text className="text-white text-base font-medium px-6 mb-4">Blazer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {BOWS.map((_, index) => (
              <TouchableOpacity 
                key={`blazer-${index}`} 
                activeOpacity={0.8} 
                className="mr-3 items-center opacity-80"
                onPress={() => setSelectedBody(index)}
              >
                <View className="w-[72px] h-[90px] rounded-xl border border-[#3A144E] bg-black/40 overflow-hidden justify-center items-center pb-4">
                  {/* Just use court image loosely as a placeholder for a bow for now since we have no bow assets */}
                  <Image 
                      source={require('../../assets/images/avatar/body/court.png')}
                      className="w-[50%] h-[50%]"
                      resizeMode="contain"
                  />
                </View>
                {/* Price tag */}
                <View className="absolute bottom-0 bg-[#3A144E] px-2 py-1 rounded-full flex-row items-center">
                  <Text className="text-xs opacity-50">🪙</Text>
                  <Text className="text-white text-[10px] font-bold ml-1 opacity-50">224</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </ScrollView>

      {/* Floating Create Avatar Button */}
      <View className="absolute bottom-8 w-full px-10">
        <TouchableOpacity 
          className="w-full bg-black/60 border border-[#B366FF] py-4 rounded-full items-center justify-center backdrop-blur-md"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-base">Create avatar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0318', 
  },
});

export default GenerateAvatarScreen;
