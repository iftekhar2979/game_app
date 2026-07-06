import React, { useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, Animated, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import OutlineButton from '../../components/Button/OutlineButton';

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingCarousel'>;

const OnboardingCarousel = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPrevious = () => {
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  };

  const goToNext = () => {
    scrollViewRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const index = Math.round(x / width);
        if (index !== activeIndex) setActiveIndex(index);
      },
    }
  );

  const renderDot = (index: number) => {
    const dotWidth = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [6, 24, 6],
      extrapolate: 'clamp',
    });
    const dotColor = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: ['rgba(255,255,255,0.3)', '#EAB308', 'rgba(255,255,255,0.3)'],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={index}
        style={{
          width: dotWidth,
          height: 6,
          backgroundColor: dotColor,
          borderRadius: 3,
          marginRight: index < 2 ? 6 : 0,
        }}
      />
    );
  };

  const backButtonOpacity = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const step3GlowOpacity = scrollX.interpolate({
    inputRange: [width, width * 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-1 bg-background">
      {/* Animated Soft Glow for Step 3 - Sits behind the header */}
      <Animated.View style={{ position: 'absolute', top: -100, left: 0, right: 0, alignItems: 'center', opacity: step3GlowOpacity, zIndex: 0 }}>
        <Svg height="800" width="800">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#FFB444" stopOpacity="0.25" />
              <Stop offset="40%" stopColor="#FFB444" stopOpacity="0.15" />
              <Stop offset="70%" stopColor="#FFB444" stopOpacity="0.05" />
              <Stop offset="100%" stopColor="#FFB444" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="400" cy="400" r="400" fill="url(#glow)" />
        </Svg>
      </Animated.View>

      {/* Header - Fixed at Top */}
      <View
        className="w-full flex-row justify-between items-center px-6 z-50"
        style={{ paddingTop: Math.max(insets.top, 24) }}
      >
        {/* Conditional Rendering / Animated Opacity Back Button */}
        <Animated.View style={{ opacity: backButtonOpacity }} pointerEvents={activeIndex === 0 ? 'none' : 'auto'}>
          <TouchableOpacity
            onPress={goToPrevious}
            className="w-10 h-10 bg-white/10 rounded-lg justify-center items-center"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
        </Animated.View>

        {/* Smooth Animated Pagination Dots */}
        <View className="flex-row items-center">
          {[0, 1, 2].map(renderDot)}
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Step 1 Content (formerly OnboardingScreen2) */}
        <View style={{ width, flex: 1 }}>
          <Image
            source={require('../../assets/images/onboarding2/bg-center.png')}
            style={{ position: 'absolute', top: '25%', left: '-20%', width: 385, height: 344, opacity: 100 }}
            resizeMode="contain"
          />
          <View className="w-full px-6 z-10 mt-16">
            <Text className="text-3xl text-textPrimary font-light">Start with</Text>
            <Text className="text-6xl text-textPrimary font-extrabold mt-1 tracking-tight">CheerBattle</Text>
          </View>
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
            <Image
              source={require('../../assets/images/onboarding2/top.png')}
              style={{ position: 'absolute', top: "-7%", right: -width * 0.05, width: '100%', height: '40%' }}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/onboarding2/middle.png')}
              style={{ position: 'absolute', top: '22%', right: width * 0.01, width: '110%', height: '50%', zIndex: 10 }}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/onboarding2/bottom.png')}
              style={{ position: 'absolute', bottom: 0, right: -width * 0.05, width: '100%', height: '40%' }}
              resizeMode="contain"
            />
          </View>
          <View className="w-full px-6 pb-12 z-10 justify-end flex-1" style={{ paddingBottom: Math.max(insets.bottom, 40) }}>
            <View className="mb-10">
              <Text className="text-textSecondary text-base leading-7">Play game</Text>
              <Text className="text-textSecondary text-base leading-7">Create avatar and</Text>
              <Text className="text-textSecondary text-base leading-7">Earn points</Text>
            </View>
            <TouchableOpacity onPress={goToNext}>
              <Text className="text-yellow-500 font-semibold underline text-sm tracking-wide">Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 2 Content (formerly OnboardingScreen3) */}
        <View style={{ width, flex: 1 }}>
          <View className="flex-1 items-center justify-start">
            <View className="w-full items-center justify-center relative" style={{ height: height * 0.55 }}>
              <Image
                source={require('../../assets/images/onboarding3/onboardbg.png')}
                style={{ position: 'absolute', width: '120%', height: '100%', opacity: 0.8 }}
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

            {/* Center Faded Background Text Image */}
            <View className="absolute items-center justify-center w-full" style={{ zIndex: 0, top: '55%' }} pointerEvents="none">
              <Image
                source={require('../../assets/images/onboarding4/createavatar.png')}
                style={{ width: '150%', height: 100, opacity: 0.5, marginTop: 80 }}
                resizeMode="contain"
              />
            </View>

            <View className="px-10 items-center mt-6 z-20">
              <Text className="text-3xl text-textPrimary font-extrabold mb-4 text-center tracking-tight">Create avatar</Text>
              <Text className="text-sm text-textSecondary text-center leading-6">
                Design your unique cheer identity. Personalize your avatar with outfits, hairstyles, and accessories.
              </Text>
            </View>
            <TouchableOpacity className="mt-8 z-20" onPress={goToNext}>
              <Text className="text-yellow-500 font-semibold underline text-sm tracking-wide">Skip for now</Text>
            </TouchableOpacity>
          </View>
          <View className="w-full px-12 z-20" style={{ paddingBottom: Math.max(insets.bottom, 40) }}>
            <OutlineButton
              title="Let's get start"
              onPress={() => navigation.replace('SignIn')}
            />
          </View>
        </View>

        {/* Step 3 Content (New Screen) */}
        <View style={{ width, flex: 1, backgroundColor: 'transparent' }}>
          <View className="flex-1 items-center justify-start pt-12 z-10">
            {/* Main Full Image (Trophy + Background) */}
            <View className="w-full items-center justify-center relative" style={{ height: height * 0.45 }}>

              <Image
                source={require('../../assets/images/onboarding4/bgimage-onboarding4.png')}
                style={{ width: '100%', height: '100%', zIndex: 10 }}
                resizeMode="contain"
              />
            </View>

            {/* Center Faded Background Text Image */}
            <View className="absolute items-center justify-center w-full" style={{ zIndex: 0, top: '55%' }} pointerEvents="none">
              <Image
                source={require('../../assets/images/onboarding4/createavatar.png')}
                style={{ width: '150%', height: 100, opacity: 0.05 }}
                resizeMode="contain"
              />
            </View>

            <View className="px-10 items-center mt-8 z-20">
              <Text className="text-3xl text-textPrimary font-extrabold mb-4 text-center tracking-tight">Play cheer and win</Text>
              <Text className="text-sm text-textSecondary text-center leading-6">
                Pick the best teams, compete with friends, and prove you're the ultimate cheer manager.
              </Text>
            </View>
            <TouchableOpacity className="mt-8 z-20" onPress={goToNext}>
              <Text className="text-yellow-500 font-semibold underline text-sm tracking-wide">Skip for now</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Area with Arc */}
          <View className="w-full z-20 absolute bottom-0 items-center justify-end" style={{ height: 180 }}>
            <View style={{ paddingBottom: Math.max(insets.bottom, 40) + 40, zIndex: 10 }}>
              <OutlineButton
                title="Let's get start"
                onPress={() => console.log('Finish onboarding')}
              />
            </View>
            <Image
              source={require('../../assets/images/onboarding4/bottom.png')}
              style={{ position: 'absolute', bottom: 0, width: width, height: 80 }}
              resizeMode="stretch"
            />
          </View>
        </View>

        {/* Optional 4th Step could go here since there are 4 dots */}
      </Animated.ScrollView>
    </View>
  );
};

export default OnboardingCarousel;
