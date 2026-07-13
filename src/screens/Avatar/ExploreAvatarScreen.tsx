import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, FlatList, Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Edit2 } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExploreAvatar'>;

const SKIRTS = [
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/full_pant_33.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/short_pant_1.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/short_pant_2.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/short_pant_3.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/black_short_pant_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/blue_short_pant_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/green_short_pant_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/green_pant_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/red_short_pant_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/green_short_pant_2.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/pants/blue_short_pant_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/pants/red_short_pant_2_1.png') },
];

const SHOES = [
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/green_shoe_1.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/green_shoe_14.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/green_shoes_41.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/shoe_1.png') },
];

const UPPERBODIES = [
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/suit1.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/half_sleve_blouse_1.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/full_sleve_1.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/necksleb_1.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/neckless_sleve_2.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_1_2.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/green_shirt_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/red_shirt_1_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/black_shirt_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/black_undershirt_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/blue_undershirt_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/green_shirt_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/green_undershirt_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/red_undershirt_2_1.png') },
];

const HAIRS = [
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/hair/Hair2.png') },
  { target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/hair/Hair6.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_1.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_2.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_5.png') },
  { target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/hair_1_3.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/hair_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_3.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_4.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_5.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/red_hair_2_1.png') },
  { target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/white_hair_2_2.png') },
];

const getRandomItem = (array: any[]) => array[Math.floor(Math.random() * array.length)];

const AVATARS = [
  { id: 4, isFullbody: true, target: 'female', avatarCategory: 4, image: require('../../assets/images/avatar/base/base_avatar_3.png') },
  { id: 5, isFullbody: true, target: 'female', avatarCategory: 5, image: require('../../assets/images/avatar/base/base_avatar_4.png') },
  { id: 6, isFullbody: true, target: 'female', avatarCategory: 6, image: require('../../assets/images/avatar/base/base_avatar_5.png') },
  { id: 1, isFullbody: true, target: 'male', avatarCategory: 1, image: require('../../assets/images/avatar/base/male_avatar_1.png') },
  { id: 2, isFullbody: true, target: 'male', avatarCategory: 2, image: require('../../assets/images/avatar/base/male_avatar_2.png') },
].map(avatar => {
  const target = avatar.target || 'female';
  const category = avatar.avatarCategory || 1;
  const targetSkirts = SKIRTS.filter(s => s.target === target && s.avatarCategories && s.avatarCategories.includes(category)).map(s => s.source);
  const targetShoes = SHOES.filter(s => s.target === target && s.avatarCategories && s.avatarCategories.includes(category)).map(s => s.source);
  const targetUpperbodies = UPPERBODIES.filter(s => s.target === target && s.avatarCategories && s.avatarCategories.includes(category)).map(s => s.source);
  const targetHairs = HAIRS.filter(s => s.target === target && s.avatarCategories && s.avatarCategories.includes(category)).map(s => s.source);

  return {
    ...avatar,
    randomSkirt: targetSkirts.length > 0 ? getRandomItem(targetSkirts) : null,
    randomShoes: targetShoes.length > 0 ? getRandomItem(targetShoes) : null,
    randomUpperbody: targetUpperbodies.length > 0 ? getRandomItem(targetUpperbodies) : null,
    randomHair: targetHairs.length > 0 ? getRandomItem(targetHairs) : null,
  };
});
const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((width - 48 - 24) / 3); // 48 for screen padding (px-6 is 24*2), 24 for gaps (12*2)
const HALF_BODY_CARD_HEIGHT = CARD_WIDTH * 1.3;
const FULL_BODY_CARD_HEIGHT = CARD_WIDTH * 1.9;

const halfBodyAvatars = AVATARS.filter(a => !a.isFullbody);
const fullBodyAvatars = AVATARS.filter(a => a.isFullbody);


const ExploreAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item, index }: { item: { id: number; image: any; isFullbody?: boolean; randomSkirt?: any; randomShoes?: any; randomUpperbody?: any; randomHair?: any; target?: string; avatarCategory?: number }, index: number }) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.8}
      style={{
        width: CARD_WIDTH,
        height: item.isFullbody ? FULL_BODY_CARD_HEIGHT : HALF_BODY_CARD_HEIGHT,
        marginBottom: 12,
        marginRight: (index % 3 !== 2) ? 12 : 0,
      }}
      onPress={() => navigation.navigate('GenerateAvatar', { baseImage: item.image, isFullbody: item.isFullbody, target: item.target as any, avatarCategory: item.avatarCategory })}
    >
      <View className="flex-1 rounded-2xl border-2 border-[#5B1F7D] overflow-hidden bg-[#1A0B2E]">
        <Image
          source={item.image}
          className={item.isFullbody ? "absolute w-full h-full scale-[2.6] mt-4" : "absolute w-full h-full"}
          resizeMode={item.isFullbody ? 'contain' : 'cover'}
        />
        {item.isFullbody && (
          <>
            <Image source={item.randomSkirt} className="absolute w-full h-full scale-[2.6] mt-4" resizeMode="contain" />
            <Image source={item.randomShoes} className="absolute w-full h-full scale-[2.6] mt-4" resizeMode="contain" />
            <Image source={item.randomUpperbody} className="absolute w-full h-full scale-[2.6] mt-4" resizeMode="contain" />
            <Image source={item.randomHair} className="absolute w-full h-full scale-[2.6] mt-4" resizeMode="contain" />
          </>
        )}
        {/* Decorative team initials like in the mock */}
        <View className="absolute bottom-2 w-full items-center z-10">
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
        {/* <View className="px-6 mb-4">
          <Text className="text-white text-lg font-medium">Half body avatar</Text>
        </View> */}

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
