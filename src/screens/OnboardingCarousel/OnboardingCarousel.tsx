import React, { useRef } from 'react';
import { ScrollView, View, Dimensions } from 'react-native';
import OnboardingScreen2 from '../Onboarding2/OnboardingScreen2';
import OnboardingScreen3 from '../Onboarding3/OnboardingScreen3';

const { width } = Dimensions.get('window');

const OnboardingCarousel = () => {
  const scrollViewRef = useRef<ScrollView>(null);

  const goToPrevious = () => {
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  };

  const goToNext = () => {
    scrollViewRef.current?.scrollTo({ x: width, animated: true });
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      bounces={false}
      style={{ flex: 1 }}
    >
      <View style={{ width, flex: 1 }}>
        <OnboardingScreen2 />
      </View>
      <View style={{ width, flex: 1 }}>
        <OnboardingScreen3 onBack={goToPrevious} />
      </View>
    </ScrollView>
  );
};

export default OnboardingCarousel;
