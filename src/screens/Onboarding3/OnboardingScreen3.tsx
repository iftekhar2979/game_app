import React from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OutlineButton from '../../components/Button/OutlineButton';
import { ChevronLeft } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  onBack?: () => void;
}

const OnboardingScreen3 = ({ onBack }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="w-full flex-row justify-between items-center px-6 z-20"
        style={{ paddingTop: Math.max(insets.top, 24) }}
      >
        <TouchableOpacity
          onPress={onBack}
          className="w-10 h-10 bg-white/10 rounded-lg justify-center items-center"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>

        {/* Pagination Dots */}
        <View className="flex-row items-center">
          <View className="w-1.5 h-1.5 bg-white/30 rounded-full mr-1.5" />
          <View className="w-6 h-1.5 bg-yellow-500 rounded-full mr-1.5" />
          <View className="w-1.5 h-1.5 bg-white/30 rounded-full mr-1.5" />
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 items-center justify-start mt-4">
        {/* Avatar and Sparkles Background */}
        <View className="w-full items-center justify-center relative" style={{ height: height * 0.45 }}>
          {/* Sparkles background */}
          <Image
            source={require('../../assets/images/onboarding3/onboardbg.png')}
            style={{ position: 'absolute', width: '120%', height: '120%', opacity: 0.8 }}
            resizeMode="cover"
          />
          {/* Main Avatar & Shadow Container */}
          <View style={{ width: '80%', height: '100%', zIndex: 10 }}>
            <Image
              source={require('../../assets/images/onboarding3/onboard-third-main.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
            {/* Bottom Shadow Overlay Image */}
            <Image
              source={require('../../assets/images/onboarding3/Rectangle.png')}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '40%', zIndex: 11 }}
              resizeMode="stretch"
            />
          </View>
        </View>

        {/* Huge faded text in background */}
        <Text
          className="absolute text-white/5 font-black uppercase text-center"
          style={{ fontSize: 90, top: '45%', width: '200%', left: '-50%' }}
          numberOfLines={1}

        >
          CREATE AVATAR
        </Text>

        {/* Text Content */}
        <View className="px-10 items-center mt-6 z-20">
          <Text className="text-3xl text-textPrimary font-extrabold mb-4 text-center tracking-tight">Create avatar</Text>
          <Text className="text-sm text-textSecondary text-center leading-6">
            Design your unique cheer identity. Personalize your avatar with outfits, hairstyles, and accessories.
          </Text>
        </View>

        {/* Skip Link */}
        <TouchableOpacity className="mt-8 z-20">
          <Text className="text-yellow-500 font-semibold underline text-sm tracking-wide">Skip for now</Text>
        </TouchableOpacity>
      </View>

      {/* Footer / Button Area */}
      <View className="w-full px-12 z-20" style={{ paddingBottom: Math.max(insets.bottom, 40) }}>
        <OutlineButton
          title="Let's get start"
          onPress={() => console.log('Finish onboarding')}
        />
      </View>
    </View>
  );
};

export default OnboardingScreen3;
