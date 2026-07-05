import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import CustomLoader from '../../components/Loader/CustomLoader';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';

const { width } = Dimensions.get('window');

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
      {/* Logo Section with its own Background */}
      <View style={{ flex: 6 }} className="justify-center items-center w-full pt-12">
        <ImageBackground
          source={require('../../assets/images/onboardbg.png')}
          className="w-full h-full justify-end items-center"
          resizeMode="cover"
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: 300, height: 300 }}
            resizeMode="contain"
          />
        </ImageBackground>
      </View>

      {/* Text Content Section */}
      <View style={{ flex: 3 }} className="justify-center items-center px-10 pb-6">
        <Text className="text-4xl font-bold text-textPrimary mb-4 text-center tracking-tight">CheerBattle</Text>
        <Text className="text-sm text-textSecondary text-center leading-6">
          Charizard is known for its dragon-like appearance, with a large wingspan
          and a long, pointed tail. He is capable of using powerful Fire-type
          attacks as well as Flying-type moves.
        </Text>
      </View>

      {/* Loader Section */}
      <View style={{ flex: 2 }} className="justify-center items-center">
        <CustomLoader size={40} color={colors.primary} />
      </View>
    </View>
  );
};

export default OnboardingScreen;
