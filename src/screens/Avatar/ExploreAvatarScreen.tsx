import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Edit2 } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExploreAvatar'>;

// Generate 12 mock items for the grid
const AVATARS = Array.from({ length: 12 }).map((_, i) => ({ id: i.toString() }));
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 24) / 3; // 48 for screen padding (px-6 is 24*2), 24 for gaps (12*2)

const ExploreAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: { id: string } }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.3, marginBottom: 12 }}
      onPress={() => navigation.navigate('GenerateAvatar')}
    >
      <View className="flex-1 rounded-2xl border-2 border-[#5B1F7D] overflow-hidden bg-[#1A0B2E]">
        <Image 
          source={require('../../assets/images/avatar/base/base_female-Photoroom.png')}
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

      <View className="flex-1">
        {/* Section Title */}
        <View className="px-6 mb-4">
          <Text className="text-white text-lg font-medium">Half body avatar</Text>
        </View>
        
        {/* Grid List */}
        <FlatList
          data={AVATARS}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
        />
      </View>

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
