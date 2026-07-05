import React from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { width, height } = Dimensions.get('window');

const OnboardingScreen2 = () => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      {/* Background Faded Image */}
      <Image
        source={require('../../assets/images/onboarding2/bg-center.png')}
        style={{
          position: 'absolute',
          top: '25%',
          left: '-20%',
          width: 385,
          height: 344,
          opacity: 100,
        }}
        resizeMode="contain"
      />

      {/* Header */}
      <View
        className="w-full flex-row justify-end items-center px-6 z-10"
        style={{ paddingTop: Math.max(insets.top, 24) }}
      >
        {/* Pagination Dots */}
        <View className="flex-row items-center">
          <View className="w-6 h-1.5 bg-yellow-500 rounded-full mr-1.5" />
          <View className="w-1.5 h-1.5 bg-white/30 rounded-full mr-1.5" />
          <View className="w-1.5 h-1.5 bg-white/30 rounded-full" />
        </View>
      </View>

      {/* Title Section */}
      <View className="w-full px-6 z-10 mt-16">
        <Text className="text-3xl text-textPrimary font-light">Start with</Text>
        <Text className="text-6xl text-textPrimary font-extrabold mt-1 tracking-tight">CheerBattle</Text>
      </View>

      {/* Image Collage (Absolute Positioned on the right) */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: height * 0.22,
          width: width * 0.65,
          height: height * 0.7,
          zIndex: 5,
        }}
      >
        {/* Top Image */}
        <Image
          source={require('../../assets/images/onboarding2/top.png')}
          style={{
            position: 'absolute',
            top: "-7%",
            right: -width * 0.05,
            width: '100%',
            height: '40%',
          }}
          resizeMode="contain"
        />
        {/* Middle Image */}
        <Image
          source={require('../../assets/images/onboarding2/middle.png')}
          style={{
            position: 'absolute',
            top: '22%',
            // left: '1%',
            right: width * 0.01,
            width: '110%',
            height: '50%',
            zIndex: 10,
          }}
          resizeMode="contain"
        />
        {/* Bottom Image */}
        <Image
          source={require('../../assets/images/onboarding2/bottom.png')}
          style={{
            position: 'absolute',
            bottom: 0,
            right: -width * 0.05,
            width: '100%',
            height: '40%',
          }}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Content */}
      <View className="w-full px-6 pb-12 z-10 justify-end flex-1" style={{ paddingBottom: Math.max(insets.bottom, 40) }}>
        <View className="mb-10">
          <Text className="text-textSecondary text-base leading-7">Play game</Text>
          <Text className="text-textSecondary text-base leading-7">Create avatar and</Text>
          <Text className="text-textSecondary text-base leading-7">Earn points</Text>
        </View>
        <TouchableOpacity>
          <Text className="text-yellow-500 font-semibold underline text-sm tracking-wide">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingScreen2;
