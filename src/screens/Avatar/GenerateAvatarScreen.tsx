import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import ViewShot from 'react-native-view-shot';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLazyGetPreSignedUrlQuery } from '../../store/api/usersApi';
import { useSaveAvatarMutation } from '../../store/api/avatarApi';
import { uploadImage } from '../../services/mediaUpload';
import { authStorage } from '../../services/authStorage';
import { showToast } from '../../utils/toast';
import { BASES, FULLBODY_STAGE_SCALE, indexOfAsset, listFor } from '../../avatar/registry';
import { REGISTRY_VERSION } from '../../avatar/registry';
import { AvatarConfig, AvatarSlot } from '../../avatar/types';

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
const ALL_HAIR_STYLES: AvatarAsset[] = [
  { id: 2, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/hair/Hair2.png') },
  { id: 3, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/hair/Hair6.png') },
  { id: 4, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_1.png') },
  { id: 5, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_2.png') },
  { id: 6, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_5.png') },
  { id: 7, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/hair_1_3.png') },
  { id: 8, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/hair_2_1.png') },
  { id: 9, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_3.png') },
  { id: 10, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_4.png') },
  { id: 11, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_5.png') },
  { id: 12, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/red_hair_2_1.png') },
  { id: 13, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/white_hair_2_2.png') },
];
const HAIR_COLORS = [
  '#E6C27A', '#8D5B36', '#4A2F1D', '#1A1A1A', '#A33327', '#E6E6E6'
];
const ALL_BLAZERS: AvatarAsset[] = [
  { id: 1, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/suit1.png') },
  { id: 2, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/half_sleve_blouse_1.png') },
  { id: 3, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/full_sleve_1.png') },
  { id: 4, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/necksleb_1.png') },
  { id: 5, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/neckless_sleve_2.png') },
  { id: 6, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_1_1.png') },
  { id: 7, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_1_2.png') },
  { id: 8, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/green_shirt_1_1.png') },
  { id: 9, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/red_shirt_1_1.png') },
  { id: 10, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/black_shirt_2_1.png') },
  { id: 11, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/black_undershirt_2_1.png') },
  { id: 12, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_2_1.png') },
  { id: 13, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/blue_undershirt_2_1.png') },
  { id: 14, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/green_shirt_2_1.png') },
  { id: 15, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/green_undershirt_2_1.png') },
  { id: 16, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/red_undershirt_2_1.png') },
];

// --- FULL BODY ASSETS ---
type AvatarAsset = { id: number; target: 'female' | 'male'; avatarCategories: number[]; source: any };

const ALL_FULLBODY_HAIR: AvatarAsset[] = [
  { id: 2, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/hair/Hair2.png') },
  { id: 3, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/hair/Hair6.png') },
  { id: 4, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_1.png') },
  { id: 5, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_2.png') },
  { id: 6, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/black_hair_1_5.png') },
  { id: 7, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/hair/hair_1_3.png') },
  { id: 8, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/hair_2_1.png') },
  { id: 9, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_3.png') },
  { id: 10, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_4.png') },
  { id: 11, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/black_hair_2_5.png') },
  { id: 12, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/red_hair_2_1.png') },
  { id: 13, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/hair/white_hair_2_2.png') },
];
const ALL_FULLBODY_SKIRTS: AvatarAsset[] = [
  { id: 1, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/full_pant_33.png') },
  { id: 2, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/short_pant_1.png') },
  { id: 3, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/short_pant_2.png') },
  { id: 4, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/skirt/short_pant_3.png') },
  { id: 5, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/black_short_pant_1_1.png') },
  { id: 6, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/blue_short_pant_1_1.png') },
  { id: 7, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/green_short_pant_1_1.png') },
  { id: 11, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/green_pant_1_1.png') },
  { id: 12, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/red_short_pant_1_1.png') },
  { id: 8, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/pants/green_short_pant_2.png') },
  { id: 9, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/pants/blue_short_pant_2_1.png') },
  { id: 10, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/pants/red_short_pant_2_1.png') },
];
const ALL_FULLBODY_OUTFITS: AvatarAsset[] = [
  { id: 1, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/suit1.png') },
  { id: 2, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/half_sleve_blouse_1.png') },
  { id: 3, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/full_sleve_1.png') },
  { id: 4, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/necksleb_1.png') },
  { id: 5, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/upperbody/neckless_sleve_2.png') },
  { id: 6, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_1_1.png') },
  { id: 7, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_1_2.png') },
  { id: 8, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/green_shirt_1_1.png') },
  { id: 9, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/male/upperbody/red_shirt_1_1.png') },
  { id: 10, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/black_shirt_2_1.png') },
  { id: 11, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/black_undershirt_2_1.png') },
  { id: 12, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/blue_shirt_2_1.png') },
  { id: 13, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/blue_undershirt_2_1.png') },
  { id: 14, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/green_shirt_2_1.png') },
  { id: 15, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/green_undershirt_2_1.png') },
  { id: 16, target: 'male', avatarCategories: [2], source: require('../../assets/images/avatar/male/upperbody/red_undershirt_2_1.png') },
];
const ALL_SHOES: AvatarAsset[] = [
  { id: 1, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/green_shoe_1.png') },
  { id: 2, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/green_shoe_14.png') },
  { id: 3, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/green_shoes_41.png') },
  { id: 4, target: 'female', avatarCategories: [4, 5, 6], source: require('../../assets/images/avatar/fullbody/shoes/shoe_1.png') },
];

const ALL_BODY_COLORS: AvatarAsset[] = [
  { id: 1, target: 'male', avatarCategories: [1], source: require('../../assets/images/avatar/fullbody/body_color/brown_yellow.png') },
];

const GenerateAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GenerateAvatarRouteProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const viewShotRef = useRef<any>(null);

  const [saveAvatarToServer, { isLoading: isUpdating }] = useSaveAvatarMutation();
  const [getPreSignedUrl] = useLazyGetPreSignedUrlQuery();
  const [isSaving, setIsSaving] = useState(false);
  // Strips the preview chrome for the one frame that gets captured.
  const [isCapturing, setIsCapturing] = useState(false);

  const target = route.params?.target || 'female';
  const avatarCategory = route.params?.avatarCategory || 1;

  const HAIR_STYLES = ALL_HAIR_STYLES.filter(a => a.target === target && a.avatarCategories && a.avatarCategories.includes(avatarCategory));
  const BLAZERS = ALL_BLAZERS.filter(a => a.target === target && a.avatarCategories && a.avatarCategories.includes(avatarCategory));
  const FULLBODY_HAIR = ALL_FULLBODY_HAIR.filter(a => a.target === target && a.avatarCategories && a.avatarCategories.includes(avatarCategory));
  const FULLBODY_SKIRTS = ALL_FULLBODY_SKIRTS.filter(a => a.target === target && a.avatarCategories && a.avatarCategories.includes(avatarCategory));
  const FULLBODY_OUTFITS = ALL_FULLBODY_OUTFITS.filter(a => a.target === target && a.avatarCategories && a.avatarCategories.includes(avatarCategory));
  const SHOES = ALL_SHOES.filter(a => a.target === target && a.avatarCategories && a.avatarCategories.includes(avatarCategory));
  const BODY_COLORS = ALL_BODY_COLORS.filter(a => a.target === target && a.avatarCategories && a.avatarCategories.includes(avatarCategory));

  const baseImage = route.params?.baseImage || require('../../assets/images/avatar/base/base_avatar_3.png');
  const isFullbody = route.params?.isFullbody === true;

  /**
   * The base this look is built on. Derived from the route's target + category
   * rather than the `require()` handle, so the saved config references a stable
   * id instead of a bundler-assigned number.
   */
  const activeBase = BASES.find((b) => b.target === target && b.category === avatarCategory);

  /**
   * The pickers still hold indices into their filtered lists; the registry
   * preserves that same order, so an index maps back to a stable asset id here.
   * Only ids are ever persisted - an index would silently point at different
   * artwork as soon as any asset is added or reordered.
   */
  const idAt = (slot: AvatarSlot, index: number | null): string | null => {
    if (index === null || index === undefined || !activeBase) return null;
    const options = listFor(slot, activeBase.target, activeBase.category);
    return options[index]?.id ?? null;
  };

  /**
   * Edit mode. Present when the wardrobe reopened a saved look; absent when
   * Explore started a new one, which leaves every seed below on its default.
   */
  const savedConfig = route.params?.config ?? null;

  /**
   * The picker index for a saved part — the exact inverse of `idAt` above, so a
   * config that round-trips through the editor comes back unchanged.
   *
   * A slot the user deliberately left empty stays empty, and a part whose art
   * has since been retired resolves to `null` rather than to whatever now sits
   * at that index.
   */
  const seed = (slot: AvatarSlot, fallback: number | null): number | null => {
    if (!savedConfig || !activeBase) return fallback;
    return indexOfAsset(slot, activeBase.target, activeBase.category, savedConfig.parts?.[slot]);
  };

  const buildConfig = (): AvatarConfig => ({
    version: REGISTRY_VERSION,
    base: activeBase!.id,
    parts: {
      bodyColor: idAt('bodyColor', selectedBodyColor),
      skirt: idAt('skirt', isFullbody ? selectedFullbodySkirt : null),
      shoes: idAt('shoes', isFullbody ? selectedShoes : null),
      outfit: idAt('outfit', isFullbody ? selectedFullbodyOutfit : selectedBody),
      hair: idAt('hair', isFullbody ? selectedFullbodyHair : selectedHair),
    },
    hairColor: selectedHairColor,
  });
  const previewHeight = isFullbody ? FULLBODY_PREVIEW_HEIGHT : PREVIEW_HEIGHT;

  const getHalfClosedEyeSource = () => {
    if (target === 'male' && avatarCategory === 2) {
      return require('../../assets/images/avatar/utils/half_closed_eye_male_2.png');
    }
    if (target === 'male' && avatarCategory === 1) {
      return require('../../assets/images/avatar/utils/half_closed_eye_male_1.png');
    }
    return require('../../assets/images/avatar/utils/half_closed_eye_female_all.png');
  };

  const getFullClosedEyeSource = () => {
    if (target === 'male' && avatarCategory === 2) {
      return require('../../assets/images/avatar/utils/full_closed_eye_male_2.png');
    }
    if (target === 'male' && avatarCategory === 1) {
      return require('../../assets/images/avatar/utils/full_closed_eye_male_1.png');
    }
    return require('../../assets/images/avatar/utils/full_closed_eye_female_all.png');
  };

  // Every picker is seeded in its useState initializer, so edit mode's first
  // paint is already the saved look. Hydrating in an effect instead would flash
  // the defaults for a frame and would clobber a fast first tap.

  // Shared state
  const [selectedHairColor, setSelectedHairColor] = useState<string | null>(
    () => savedConfig?.hairColor ?? null,
  );
  const [selectedBodyColor, setSelectedBodyColor] = useState<number | null>(
    () => seed('bodyColor', avatarCategory === 1 ? 0 : null),
  );

  // Half body state
  const [selectedHair, setSelectedHair] = useState<number | null>(
    () => (!isFullbody ? seed('hair', 0) : null),
  );
  const [selectedBody, setSelectedBody] = useState<number | null>(
    () => (!isFullbody ? seed('outfit', 0) : null),
  );

  // Full body state
  const [selectedFullbodyHair, setSelectedFullbodyHair] = useState<number | null>(
    () => (isFullbody ? seed('hair', 0) : null),
  );
  const [selectedFullbodySkirt, setSelectedFullbodySkirt] = useState<number | null>(
    () => (isFullbody ? seed('skirt', 0) : null),
  );
  const [selectedFullbodyOutfit, setSelectedFullbodyOutfit] = useState<number | null>(
    () => (isFullbody ? seed('outfit', 0) : null),
  );
  const [selectedShoes, setSelectedShoes] = useState<number | null>(
    () => (isFullbody ? seed('shoes', 0) : null),
  );

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
    outputRange: [1, 1.010],
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
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          >
            <View
              style={[
                styles.previewContainer,
                { height: previewHeight },
                // Chrome is stripped for the capture frame only, so the saved
                // PNG is the character on transparency rather than an opaque
                // dark card that shows as corners in a circular frame.
                isCapturing && styles.capturingContainer,
              ]}
            >
              {!isCapturing && (
                <View className="absolute top-10 w-48 h-48 rounded-full bg-[#B366FF] opacity-20 blur-3xl" />
              )}

              <Animated.View
                style={[
                  isFullbody ? styles.fullbodyStage : styles.avatarStage,
                  {
                  transform: [
                    { scaleX: breatheScaleX },
                    { scaleY: breatheScaleY },
                    ...(isFullbody ? [{ scale: FULLBODY_STAGE_SCALE }] : []),
                  ],
                  transformOrigin: 'bottom center' as any,
                }
                ]}
              >
                {/* Base Head / Base Body */}
                <Image
                  source={baseImage}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />

                {/* Body Color Layer (Conditional for avatarCategory === 1) */}
                {avatarCategory === 1 && selectedBodyColor !== null && BODY_COLORS[selectedBodyColor] && (
                  <Image
                    source={BODY_COLORS[selectedBodyColor].source}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}

                {/* Eye Blinking Animation Overlay - Opacity toggled to prevent load lag */}
                <Image
                  source={getHalfClosedEyeSource()}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                  style={{ opacity: eyeState === 'half_closed' ? 1 : 0 }}
                />
                <Image
                  source={getFullClosedEyeSource()}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                  style={{ opacity: eyeState === 'closed' ? 1 : 0 }}
                />

                {/* --- HALF BODY LAYERS --- */}
                {!isFullbody && selectedBody !== null && BLAZERS[selectedBody] && (
                  <Image
                    source={BLAZERS[selectedBody].source}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}

                {!isFullbody && selectedHair !== null && HAIR_STYLES[selectedHair] && (
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



                {isFullbody && selectedFullbodyHair !== null && FULLBODY_HAIR[selectedFullbodyHair] && (
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
              {!isCapturing && (
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
              )}
            </View>
          </ViewShot>
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
                        className="w-[180%] h-[180%] absolute top-[-40%] left-[-40%]"
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

            {/* Body Color (Half Body) */}
            {BODY_COLORS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Body color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {BODY_COLORS.map((bodyColor, index) => (
                    <TouchableOpacity
                      key={`half-body-color-${index}`}
                      activeOpacity={0.8}
                      className="mr-3 items-center"
                      onPress={() => setSelectedBodyColor(selectedBodyColor === index ? null : index)}
                    >
                      <View
                        className={`w-[72px] h-[90px] rounded-xl border-2 ${selectedBodyColor === index ? 'border-[#B366FF]' : 'border-[#5B1F7D]'} bg-[#1A0B2E] overflow-hidden items-center justify-center`}
                      >
                        <Image
                          source={bodyColor.source}
                          className="w-full h-full"
                          resizeMode="contain"
                        />
                      </View>
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

            {/* Body Color (Full Body) */}
            {BODY_COLORS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Body color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {BODY_COLORS.map((bodyColor, index) => (
                    <TouchableOpacity
                      key={`fb-body-color-${index}`}
                      activeOpacity={0.8}
                      className="mr-3 items-center"
                      onPress={() => setSelectedBodyColor(selectedBodyColor === index ? null : index)}
                    >
                      <View
                        className={`w-[72px] h-[90px] rounded-xl border-2 ${selectedBodyColor === index ? 'border-[#B366FF]' : 'border-[#5B1F7D]'} bg-[#1A0B2E] overflow-hidden items-center justify-center`}
                      >
                        <Image
                          source={bodyColor.source}
                          className="w-full h-full"
                          resizeMode="contain"
                        />
                      </View>
                      <View className="absolute bottom-0 bg-[#B366FF] px-2 py-1 rounded-full flex-row items-center border border-[#3A144E]">
                        <Text className="text-xs">🪙</Text>
                        <Text className="text-white text-[10px] font-bold ml-1">224</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
          disabled={isUpdating || isSaving}
          onPress={async () => {
            if (!viewShotRef.current?.capture) return;

            if (!activeBase) {
              showToast.error('This avatar base is no longer available');
              return;
            }

            try {
              setIsSaving(true);

              // Freeze the blink loop and strip the card chrome, then let a
              // couple of frames land before capturing so the snapshot is
              // deterministic and has a transparent background.
              setEyeState('open');
              setIsCapturing(true);
              await new Promise((resolve) => setTimeout(resolve, 120));

              let uri: string;
              try {
                uri = await viewShotRef.current.capture();
              } finally {
                setIsCapturing(false);
              }
              const config = buildConfig();

              // Reuses the shared upload helper: it checks the PUT response and
              // returns the S3 *key*. The key is what gets persisted - a signed
              // URL expires, and the backend re-signs on every read.
              const avatarKey = await uploadImage(
                { uri, fileName: `avatar_${Date.now()}.png`, type: 'image/png' },
                getPreSignedUrl as any,
                0,
                'Profile_Images',
              );

              const saved = await saveAvatarToServer({
                avatarUrl: avatarKey,
                avatarConfig: config,
              }).unwrap();

              // Reflect it immediately, and persist so it survives a restart -
              // Redux alone is wiped on relaunch.
              // The API returns a signed URL; `?? undefined` because the auth
              // user type models "no avatar" as absent rather than null.
              const signedAvatarUrl = saved.avatarUrl ?? undefined;
              dispatch(updateUser({ avatarUrl: signedAvatarUrl }));
              const storedUser = (await authStorage.getUser()) || {};
              await authStorage.saveUser({ ...storedUser, avatarUrl: signedAvatarUrl });

              showToast.success('Avatar saved');
              navigation.navigate((route.params?.returnTo as any) ?? 'Home');
            } catch (error: any) {
              // Previously this was a bare console.error, so every failure -
              // including the presign rejecting an invalid primaryPath - looked
              // to the user like the button simply did nothing. Surface enough
              // detail to tell a capture failure from a network one.
              const status = error?.status ? ` (${error.status})` : '';
              const detail =
                error?.data?.message || error?.message || 'Unexpected error';
              console.error('[avatar] save failed', error);
              showToast.error('Could not save your avatar', `${detail}${status}`);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <Text className="text-white font-semibold text-base">{isUpdating || isSaving ? 'Saving...' : 'Create avatar'}</Text>
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
  // Applied only while capturing, so the PNG has no card background or border.
  capturingContainer: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
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
    // Scale is composed into the animated transform, not set here - see
    // FULLBODY_STAGE_SCALE.
  },
});

export default GenerateAvatarScreen;
