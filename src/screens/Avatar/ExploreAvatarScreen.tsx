import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, FlatList, Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Edit2 } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExploreAvatar'>;

const AVATARS = [
  { id: '0', image: require('../../assets/images/avatar/base/base_female-Photoroom.png') },
  { id: '1', image: require('../../assets/images/avatar/base/base_female_Photoroom2.png') },
  { id: '2', image: require('../../assets/images/avatar/base/base_female_Photoroom3.png') },
  { id: '3', image: require('../../assets/images/avatar/base/base_female_Photoroom4.png') },
  { id: '4', image: require('../../assets/images/avatar/base/base_female-fullbody-Photoroom.png') },
];
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 24) / 3; // 48 for screen padding (px-6 is 24*2), 24 for gaps (12*2)

const halfBodyAvatars = AVATARS.filter(a => !a.isFullbody);
const fullBodyAvatars = AVATARS.filter(a => a.isFullbody);

const ExploreAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item, index }: { item: { id: string; image: any; isFullbody?: boolean }, index: number }) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.8}
      style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.3, marginBottom: 12, marginRight: (index % 3 !== 2) ? 12 : 0 }}
      onPress={() => navigation.navigate('GenerateAvatar', { baseImage: item.image, isFullbody: item.isFullbody })}
    >
      <View className="flex-1 rounded-2xl border-2 border-[#5B1F7D] overflow-hidden bg-[#1A0B2E]">
        <Image
          source={item.image}
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Decorative team initials like in the mock */}
        <View className="absolute bottom-2 w-full items-center">
          <Text className="text-white font-bold italic opacity-80 text-xs shadow-lg">CB</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Section Title */}
        <View className="px-6 mb-4">
          <Text className="text-white text-lg font-medium">Half body avatar</Text>
        </View>
        
        {/* Grid List - Half Body */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24 }}>
          {halfBodyAvatars.map((item, index) => renderItem({ item, index }))}
        </View>

        {/* Full Body Section */}
        {fullBodyAvatars.length > 0 && (
          <>
            <View className="px-6 mb-4 mt-6">
              <Text className="text-white text-lg font-medium">Full body avatar</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24 }}>
              {fullBodyAvatars.map((item, index) => renderItem({ item, index }))}
            </View>
          </>
        )}
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
