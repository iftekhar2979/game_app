/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './src/screens/Onboarding';
import OnboardingCarousel from './src/screens/OnboardingCarousel';
import SignInScreen from './src/screens/Auth/SignInScreen';
import CreateAccountScreen from './src/screens/Auth/CreateAccountScreen';
import EmailVerificationScreen from './src/screens/Auth/EmailVerificationScreen';
import OTPVerificationScreen from './src/screens/Auth/OTPVerificationScreen';
import ResetPasswordScreen from './src/screens/Auth/ResetPasswordScreen';
import ExploreAvatarScreen from './src/screens/Avatar/ExploreAvatarScreen';
import GenerateAvatarScreen from './src/screens/Avatar/GenerateAvatarScreen';
import { Provider } from 'react-redux';
import { store } from './src/store';

export type RootStackParamList = {
  Onboarding1: undefined;
  OnboardingCarousel: undefined;
  SignIn: undefined;
  CreateAccount: undefined;
  EmailVerification: undefined;
  OTPVerification: undefined;
  ResetPassword: undefined;
  ExploreAvatar: undefined;
  GenerateAvatar: { baseImage: any; isFullbody?: boolean; target?: 'female' | 'male' };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding1" component={OnboardingScreen} />
            <Stack.Screen name="OnboardingCarousel" component={OnboardingCarousel} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="ExploreAvatar" component={ExploreAvatarScreen} />
            <Stack.Screen name="GenerateAvatar" component={GenerateAvatarScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
