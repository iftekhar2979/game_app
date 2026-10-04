import React from 'react';
import {
  View,
  Text,
  ImageBackground,
} from 'react-native';
import { Skeleton, SkeletonRegion } from '../../components/Skeleton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding1'>;

const OnboardingScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('OnboardingCarousel');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View className="flex-1 bg-background">
      {/* Charizard introduction artwork */}
      <View style={{ flex: 6 }} className="justify-center items-center w-full pt-12">
        <ImageBackground
          source={require('../../assets/images/onboardbg.png')}
          className="w-full h-full justify-end items-center"
          resizeMode="cover"
        >
          <View className="w-[220px] h-[220px] rounded-full bg-[#8B3DFF]/20 border border-[#FFB444]/60 items-center justify-center mb-10">
            <Text className="text-[88px]">🔥</Text>
            <Text className="text-[#FFB444] text-xl font-extrabold tracking-widest">CHARIZARD</Text>
          </View>
        </ImageBackground>
      </View>

      {/* Text Content Section */}
      <View style={{ flex: 3 }} className="justify-center items-center px-10 pb-6">
        <Text className="text-4xl font-bold text-textPrimary mb-4 text-center tracking-tight">Meet Pokémon Charizard</Text>
        <Text className="text-sm text-textSecondary text-center leading-6">
          Spread your wings with Charizard, the fiery Pokémon known for soaring
          through the sky and powerful Fire-type moves.
        </Text>
      </View>

      {/*
        A shimmering bar rather than a spinner. There is nothing to skeleton
        here - the splash is already showing everything it has - so this is the
        one place the effect is used as a plain progress cue, matched to the
        skeletons the reader meets a second later.
      */}
      <View style={{ flex: 2 }} className="justify-center items-center">
        <SkeletonRegion label="Loading">
          <Skeleton width={140} height={6} radius={3} />
        </SkeletonRegion>
      </View>
    </View>
  );
};

export default OnboardingScreen;
