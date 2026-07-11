import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'GenerateAvatar'>;
type GenerateAvatarRouteProp = RouteProp<RootStackParamList, 'GenerateAvatar'>;

const { height } = Dimensions.get('window');
const PREVIEW_HEIGHT = 320;
const FULLBODY_PREVIEW_HEIGHT = Math.min(560, height * 0.68);

// Helper to convert hex to an optimized SVG color matrix
// This avoids native crashes from FeBlend while providing a nice color tint
const hexToTintMatrix = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    // We scale the color channel but keep 25% of the original contrast to prevent mudiness
    return `${0.25 + 0.75 * r} 0 0 0 0  0 ${0.25 + 0.75 * g} 0 0 0  0 0 ${0.25 + 0.75 * b} 0 0  0 0 0 1 0`;
  }
  return '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';
};

// --- HALF BODY ASSETS ---
const HAIR_STYLES = [
  { id: 1, source: require('../../assets/images/avatar/hair/Hair.png') },
  { id: 2, source: require('../../assets/images/avatar/hair/Hair2.png') },
  { id: 3, source: require('../../assets/images/avatar/hair/hair3.png') },
  { id: 4, source: require('../../assets/images/avatar/hair/hair4.png') },
  { id: 5, source: require('../../assets/images/avatar/hair/hair5.png') },
];
const HAIR_COLORS = [
  '#E6C27A', '#8D5B36', '#4A2F1D', '#1A1A1A', '#A33327', '#E6E6E6'
];
const BLAZERS = [
  { id: 1, source: require('../../assets/images/avatar/body/court.png') },
  { id: 2, source: require('../../assets/images/avatar/body/jacket.png') },
  { id: 3, source: require('../../assets/images/avatar/body/tshirt.png') },
  { id: 4, source: require('../../assets/images/avatar/body/shirt.png') },
  { id: 5, source: require('../../assets/images/avatar/body/hoddie.png') },
];

// --- FULL BODY ASSETS ---
type AvatarAsset = { id: number; source: any };

const FULLBODY_HAIR: AvatarAsset[] = [
  // { id: 1, source: require('../../assets/images/avatar/fullbody/hair/fullbody_hair1.png') },
  { id: 2, source: require('../../assets/images/avatar/hair/Hair2.png') },
  { id: 3, source: require('../../assets/images/avatar/hair/Hair6.png') },
  // { id: 3, source: require('../../assets/images/avatar/fullbody/hair/fulbody_hair_10.png') },
  // { id: 4, source: require('../../assets/images/avatar/fullbody/hair/fullbody_hair_12.png') },
  { id: 1, source: require('../../assets/images/avatar/hair/base_avatar_hair1.png') },
];
const FULLBODY_SKIRTS: AvatarAsset[] = [
  { id: 1, source: require('../../assets/images/avatar/fullbody/skirt/full_pant_33.png') },
  { id: 2, source: require('../../assets/images/avatar/fullbody/skirt/short_pant_1.png') },
  { id: 3, source: require('../../assets/images/avatar/fullbody/skirt/short_pant_2.png') },
  { id: 4, source: require('../../assets/images/avatar/fullbody/skirt/short_pant_3.png') },
  // { id: 5, source: require('../../assets/images/avatar/fullbody/skirt/fullbody_jogger_1.png') },
  // { id: 6, source: require('../../assets/images/avatar/fullbody/skirt/fullbody_skirt_4.png') },
];
const FULLBODY_OUTFITS: AvatarAsset[] = [
  { id: 1, source: require('../../assets/images/avatar/fullbody/upperbody/suit1.png') },
  { id: 2, source: require('../../assets/images/avatar/fullbody/upperbody/half_sleve_blouse_1.png') },
  { id: 3, source: require('../../assets/images/avatar/fullbody/upperbody/full_sleve_1.png') },
  { id: 4, source: require('../../assets/images/avatar/fullbody/upperbody/necksleb_1.png') },
  { id: 5, source: require('../../assets/images/avatar/fullbody/upperbody/neckless_sleve_2.png') },
];
const SHOES: AvatarAsset[] = [
  { id: 1, source: require('../../assets/images/avatar/fullbody/shoes/green_shoe_1.png') },
  { id: 2, source: require('../../assets/images/avatar/fullbody/shoes/green_shoe_14.png') },
  { id: 3, source: require('../../assets/images/avatar/fullbody/shoes/green_shoes_41.png') },
  { id: 4, source: require('../../assets/images/avatar/fullbody/shoes/shoe_1.png') },
  // { id: 5, source: require('../../assets/images/avatar/fullbody/shoes/nakkle_catch_1.png') },
  // { id: 6, source: require('../../assets/images/avatar/fullbody/shoes/long_shoe_1.png') },
];

const GenerateAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GenerateAvatarRouteProp>();
  const insets = useSafeAreaInsets();

  const baseImage = route.params?.baseImage || require('../../assets/images/avatar/base/base_female-Photoroom.png');
  const isFullbody = route.params?.isFullbody === true;
  const previewHeight = isFullbody ? FULLBODY_PREVIEW_HEIGHT : PREVIEW_HEIGHT;

  // Shared state
  const [selectedHairColor, setSelectedHairColor] = useState<string | null>(null);

  // Half body state
  const [selectedHair, setSelectedHair] = useState<number | null>(!isFullbody ? 0 : null);
  const [selectedBody, setSelectedBody] = useState<number | null>(!isFullbody ? 0 : null);

  // Full body state
  const [selectedFullbodyHair, setSelectedFullbodyHair] = useState<number | null>(isFullbody ? 0 : null);
  const [selectedFullbodySkirt, setSelectedFullbodySkirt] = useState<number | null>(isFullbody ? 0 : null);
  const [selectedFullbodyOutfit, setSelectedFullbodyOutfit] = useState<number | null>(isFullbody ? 0 : null);
  const [selectedShoes, setSelectedShoes] = useState<number | null>(isFullbody ? 0 : null);

  // Eye Animation State
  const [eyeState, setEyeState] = useState<'open' | 'half_closed' | 'closed'>('open');

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeState('half_closed'); // Starts at 0ms
      setTimeout(() => setEyeState('closed'), 150); // Happens at 150ms
      setTimeout(() => setEyeState('half_closed'), 300); // Happens at 300ms
      setTimeout(() => setEyeState('open'), 450); // Happens at 450ms
    }, 3000); // Every 3 seconds

    return () => clearInterval(blinkInterval);
  }, []);

  // Breathing Animation State
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1, // Inhale
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0, // Exhale
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [breatheAnim]);

  const breatheScaleY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.008],
  });

  const breatheScaleX = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.008],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View className="flex-row items-center px-6 mb-8 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-[#1A0B2E] items-center justify-center border border-[#5B1F7D]"
          activeOpacity={0.8}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-medium ml-4">Customize Avatar</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Large Avatar Preview */}
        <View className="px-6 mb-8">
          <View
            style={[styles.previewContainer, { height: previewHeight }]}
          >
            {/* The glow effect behind avatar */}
            <View className="absolute top-10 w-48 h-48 rounded-full bg-[#B366FF] opacity-20 blur-3xl" />

            <Animated.View
              style={[
                isFullbody ? styles.fullbodyStage : styles.avatarStage,
                { transform: [{ scaleX: breatheScaleX }, { scaleY: breatheScaleY }], transformOrigin: 'bottom center' as any }
              ]}
            >
              {/* Base Head / Base Body */}
              <Image
                source={baseImage}
                className="absolute w-full h-full"
                resizeMode="contain"
              />

              {/* Eye Blinking Animation Overlay - Opacity toggled to prevent load lag */}
              <Image
                source={require('../../assets/images/avatar/utils/half_eye_closed.png')}
                className="absolute w-full h-full"
                resizeMode="contain"
                style={{ opacity: eyeState === 'half_closed' ? 1 : 0 }}
              />
              <Image
                source={require('../../assets/images/avatar/utils/closed_eye.png')}
                className="absolute w-full h-full"
                resizeMode="contain"
                style={{ opacity: eyeState === 'closed' ? 1 : 0 }}
              />

              {/* --- HALF BODY LAYERS --- */}
              {!isFullbody && selectedBody !== null && (
                <Image
                  source={BLAZERS[selectedBody].source}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />
              )}

              {!isFullbody && selectedHair !== null && (
                <View className="absolute w-full h-full scale-[1.03] top-[-1%]">
                  {selectedHairColor ? (
                    <Svg width="100%" height="100%">
                      <Defs>
                        <Filter id="hairColorFilter">
                          <FeColorMatrix
                            type="matrix"
                            values={hexToTintMatrix(selectedHairColor)}
                          />
                        </Filter>
                      </Defs>
                      <SvgImage
                        width="100%"
                        height="100%"
                        preserveAspectRatio="xMidYMid meet"
                        href={HAIR_STYLES[selectedHair].source}
                        filter="url(#hairColorFilter)"
                      />
                    </Svg>
                  ) : (
                    <Image
                      source={HAIR_STYLES[selectedHair].source}
                      className="absolute w-full h-full"
                      resizeMode="contain"
                    />
                  )}
                </View>
              )}

              {/* --- FULL BODY LAYERS --- */}
              {isFullbody && selectedFullbodySkirt !== null && FULLBODY_SKIRTS[selectedFullbodySkirt] && (
                <Image
                  source={FULLBODY_SKIRTS[selectedFullbodySkirt].source}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />
              )}

              {isFullbody && selectedShoes !== null && SHOES[selectedShoes] && (
                <Image
                  source={SHOES[selectedShoes].source}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />
              )}

              {isFullbody && selectedFullbodyOutfit !== null && FULLBODY_OUTFITS[selectedFullbodyOutfit] && (
                <Image
                  source={FULLBODY_OUTFITS[selectedFullbodyOutfit].source}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />
              )}



              {isFullbody && selectedFullbodyHair !== null && (
                <View className="absolute w-full h-full">
                  {selectedHairColor ? (
                    <Svg width="100%" height="100%">
                      <Defs>
                        <Filter id="fullbodyHairColorFilter">
                          <FeColorMatrix
                            type="matrix"
                            values={hexToTintMatrix(selectedHairColor)}
                          />
                        </Filter>
                      </Defs>
                      <SvgImage
                        width="100%"
                        height="100%"
                        preserveAspectRatio="xMidYMid meet"
                        href={FULLBODY_HAIR[selectedFullbodyHair].source}
                        filter="url(#fullbodyHairColorFilter)"
                      />
                    </Svg>
                  ) : (
                    <Image
                      source={FULLBODY_HAIR[selectedFullbodyHair].source}
                      className="absolute w-full h-full"
                      resizeMode="contain"
                    />
                  )}
                </View>
              )}

            </Animated.View>

            {/* Gradient Overlay to hide edge artifacts */}
            <View className="absolute bottom-0 w-full h-24 pointer-events-none">
              <Svg height="100%" width="100%">
                <Defs>
                  <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#1A0B2E" stopOpacity="0" />
                    <Stop offset="1" stopColor="#1A0B2E" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#grad)" />
              </Svg>
            </View>
          </View>
        </View>

        {/* Customization Sections */}
        {!isFullbody ? (
          <>
            {/* Hair Style */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Hair style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {HAIR_STYLES.map((hair, index) => (
                  <TouchableOpacity
                    key={`hair-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHair(index)}
                  >
                    <View className="w-[72px] h-[90px] rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden justify-end pb-6">
                      <Image
                        source={hair.source}
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
                  <TouchableOpacity
                    key={`color-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHairColor(color)}
                  >
                    <View
                      className={`w-[60px] h-[60px] rounded-full mb-3 border-2 ${selectedHairColor === color ? 'border-white' : 'border-[#5B1F7D]'}`}
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

            {/* Blazer */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Blazer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {BLAZERS.map((blazer, index) => (
                  <TouchableOpacity
                    key={`blazer-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center opacity-80"
                    onPress={() => setSelectedBody(index)}
                  >
                    <View className="w-[72px] h-[90px] rounded-xl border border-[#3A144E] bg-black/40 overflow-hidden justify-center items-center pb-4">
                      <Image
                        source={blazer.source}
                        className="w-[50%] h-[50%]"
                        resizeMode="contain"
                      />
                    </View>
                    {/* Price tag */}
                    {/* <View className="absolute bottom-0 bg-[#3A144E] px-2 py-1 rounded-full flex-row items-center">
                      <Text className="text-xs opacity-50">🪙</Text>
                      <Text className="text-white text-[10px] font-bold ml-1 opacity-50">224</Text>
                    </View> */}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        ) : (
          <>
            {/* Full Body Hair Style */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Full Body Hair</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {FULLBODY_HAIR.map((hair, index) => (
                  <TouchableOpacity
                    key={`fb-hair-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedFullbodyHair(index)}
                  >
                    <View className="w-[72px] h-[90px] rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden items-center">
                      <Image
                        source={hair.source}
                        className="w-[250%] h-[250%] absolute top-[-10%]"
                        resizeMode="contain"
                      />
                    </View>
                    {/* Price tag */}
                    {/* <View className="absolute bottom-0 bg-[#B366FF] px-2 py-1 rounded-full flex-row items-center border border-[#3A144E]">
                      <Text className="text-xs">🪙</Text>
                      <Text className="text-white text-[10px] font-bold ml-1">224</Text>
                    </View> */}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Hair Color (Shared) */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Hair color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {HAIR_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={`fb-color-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHairColor(color)}
                  >
                    <View
                      className={`w-[60px] h-[60px] rounded-full mb-3 border-2 ${selectedHairColor === color ? 'border-white' : 'border-[#5B1F7D]'}`}
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

            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Skirt</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {FULLBODY_SKIRTS.map((skirt, index) => (
                  <TouchableOpacity
                    key={`fb-skirt-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedFullbodySkirt(index)}
                  >
                    <View className="w-[72px] h-[90px] rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden items-center">
                      <Image
                        source={skirt.source}
                        className="w-[220%] h-[220%] absolute top-[-40%]"
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {FULLBODY_OUTFITS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Full Body Outfit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {FULLBODY_OUTFITS.map((outfit, index) => (
                    <TouchableOpacity
                      key={`fb-outfit-${index}`}
                      activeOpacity={0.8}
                      className="mr-3 items-center"
                      onPress={() => setSelectedFullbodyOutfit(index)}
                    >
                      <View className="w-[72px] h-[90px] rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden items-center">
                        <Image
                          source={outfit.source}
                          className="w-[220%] h-[220%] absolute top-[-25%]"
                          resizeMode="contain"
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
            )}

            {SHOES.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Shoes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {SHOES.map((shoe, index) => (
                    <TouchableOpacity
                      key={`fb-shoe-${index}`}
                      activeOpacity={0.8}
                      className="mr-3 items-center"
                      onPress={() => setSelectedShoes(index)}
                    >
                      <View className="w-[72px] h-[90px] rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden items-center">
                        <Image
                          source={shoe.source}
                          className="w-[280%] h-[280%] absolute bottom-[0%]"
                          resizeMode="contain"
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
            )}
          </>
        )}

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
  previewContainer: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#5B1F7D',
    overflow: 'hidden',
    backgroundColor: '#1A0B2E',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 16,
  },
  avatarStage: {
    width: '90%',
    height: '95%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullbodyStage: {
    width: '160%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 1.15 }],
  },
});

export default GenerateAvatarScreen;
