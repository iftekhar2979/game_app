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
// import CreateUsernameScreen from './src/screens/Auth/CreateUsernameScreen';
import EmailVerificationScreen from './src/screens/Auth/EmailVerificationScreen';
import OTPVerificationScreen from './src/screens/Auth/OTPVerificationScreen';
import ResetPasswordScreen from './src/screens/Auth/ResetPasswordScreen';
import ExploreAvatarScreen from './src/screens/Avatar/ExploreAvatarScreen';
import GenerateAvatarScreen from './src/screens/Avatar/GenerateAvatarScreen';
import HomeScreen from './src/screens/Home/HomeScreen';
import FantasyLeagueScreen from './src/screens/Home/FantasyLeagueScreen';
import CreateLeagueScreen from './src/screens/Home/CreateLeagueScreen';
import LeagueDetailScreen from './src/screens/Home/LeagueDetailScreen';
import DraftRoomScreen from './src/screens/Home/DraftRoomScreen';
import CreatePostScreen from './src/screens/Home/CreatePostScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import { Provider } from 'react-redux';
import { store } from './src/store';
import CoinStoreScreen from './src/screens/Profile/CoinStoreScreen';
import AllPostsScreen from './src/screens/Profile/AllPostsScreen';
import EditProfileScreen from './src/screens/Profile/EditProfileScreen';
import SettingsScreen from './src/screens/Profile/SettingsScreen';
import AboutUsScreen from './src/screens/Profile/AboutUsScreen';
import PrivacyPolicyScreen from './src/screens/Profile/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/Profile/TermsOfServiceScreen';
import AdminSupportScreen from './src/screens/Profile/AdminSupportScreen';
import CreateUsernameScreen from './src/screens/Auth/CreateUsernameScreen';
// import SettingsScreen from './src/screens/Profile/SettingsScreen';
// import AboutUsScreen from './src/screens/Profile/AboutUsScreen';
// import PrivacyPolicyScreen from './src/screens/Profile/PrivacyPolicyScreen';
// import TermsOfServiceScreen from './src/screens/Profile/TermsOfServiceScreen';
// import AdminSupportScreen from './src/screens/Profile/AdminSupportScreen';

export type RootStackParamList = {
  Onboarding1: undefined;
  OnboardingCarousel: undefined;
  SignIn: undefined;
  CreateAccount: undefined;
  CreateUsername: undefined;
  EmailVerification: undefined;
  OTPVerification: undefined;
  ResetPassword: undefined;
  ExploreAvatar: { returnTo?: keyof RootStackParamList } | undefined;
  GenerateAvatar: { baseImage: any; isFullbody?: boolean; target?: 'female' | 'male'; avatarCategory?: number; returnTo?: keyof RootStackParamList };
  Home: undefined;
  FantasyLeague: undefined;
  CreateLeague: undefined;
  LeagueDetail: { leagueId: string };
  DraftRoom: { leagueId: string };
  CreatePost: undefined;
  Profile: undefined;
  CoinStore: undefined;
  AllPosts: undefined;
  EditProfile: undefined;
  Settings: undefined;
  AboutUs: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  AdminSupport: undefined;
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
            <Stack.Screen name="CreateUsername" component={CreateUsernameScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="ExploreAvatar" component={ExploreAvatarScreen} />
            <Stack.Screen name="GenerateAvatar" component={GenerateAvatarScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="FantasyLeague" component={FantasyLeagueScreen} />
            <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
            <Stack.Screen name="LeagueDetail" component={LeagueDetailScreen} />
            <Stack.Screen name="DraftRoom" component={DraftRoomScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="CoinStore" component={CoinStoreScreen} />
            <Stack.Screen name="AllPosts" component={AllPostsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AboutUs" component={AboutUsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="AdminSupport" component={AdminSupportScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
