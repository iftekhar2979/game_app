import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Edit2 } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExploreAvatar'>;

// Mock data leveraging the same asset over and over
const HALF_BODY_AVATARS = [1, 2, 3];
const FULL_BODY_AVATARS = [1, 2, 3];

const ExploreAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View className="px-6 flex-row items-center mb-8">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40 mr-4"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl text-[#B366FF] font-semibold tracking-wide">Explore avatar</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Half Body Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-6 mb-4">
            <Text className="text-white text-lg font-medium">Half body avatar</Text>
            <TouchableOpacity>
              <Text className="text-[#FFB444] text-xs font-medium">See all</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {HALF_BODY_AVATARS.map((_, index) => (
              <TouchableOpacity key={`half-${index}`} className="mr-4" activeOpacity={0.8}>
                <View className="rounded-2xl border-2 border-[#5B1F7D] overflow-hidden bg-[#1A0B2E] w-[140px] h-[180px]">
                  <Image 
                    source={require('../../assets/images/avatar/base/base_female-Photoroom.png')}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  {/* Decorative team initials like in the mock */}
                  <View className="absolute bottom-3 w-full items-center">
                    <Text className="text-white font-bold italic opacity-80 text-lg shadow-lg">CB</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Full Body Section */}
        <View>
          <View className="flex-row justify-between items-center px-6 mb-4">
            <Text className="text-white text-lg font-medium">Full body avatar</Text>
            <TouchableOpacity>
              <Text className="text-[#FFB444] text-xs font-medium">See all</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {FULL_BODY_AVATARS.map((_, index) => (
              <TouchableOpacity key={`full-${index}`} className="mr-4" activeOpacity={0.8}>
                <View className="rounded-2xl border-2 border-[#5B1F7D] overflow-hidden bg-[#1A0B2E] w-[160px] h-[340px]">
                  <Image 
                    source={require('../../assets/images/avatar/base/base_female-Photoroom.png')}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                  {/* Additional layers to simulate clothes if needed */}
                  <View className="absolute top-0 left-0 w-full h-full justify-center items-center opacity-70">
                     {/* Just putting the court image here loosely to mix things up slightly */}
                     <Image 
                        source={require('../../assets/images/avatar/body/court.png')}
                        className="w-[80%] h-[80%]"
                        resizeMode="contain"
                     />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-black border border-[#5B1F7D] items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Edit2 color="#FFB444" size={24} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0318', // Very dark purple/black base
  },
});

export default ExploreAvatarScreen;
