import React, { useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './src/screens/Onboarding';
import OnboardingCarousel from './src/screens/OnboardingCarousel';
import SignInScreen from './src/screens/Auth/SignInScreen';
import CreateAccountScreen from './src/screens/Auth/CreateAccountScreen';
import ForgotPasswordScreen from './src/screens/Auth/ForgotPasswordScreen';
import OTPVerificationScreen from './src/screens/Auth/OTPVerificationScreen';
import ResetPasswordScreen from './src/screens/Auth/ResetPasswordScreen';
import ExploreAvatarScreen from './src/screens/Avatar/ExploreAvatarScreen';
import GenerateAvatarScreen from './src/screens/Avatar/GenerateAvatarScreen';
import AvatarHistoryScreen from './src/screens/Avatar/AvatarHistoryScreen';
import HomeScreen from './src/screens/Home/HomeScreen';
import FantasyLeagueScreen from './src/screens/Home/FantasyLeagueScreen';
import CreateLeagueScreen from './src/screens/Home/CreateLeagueScreen';
import LeagueDetailScreen from './src/screens/Home/LeagueDetailScreen';
import LeagueChatScreen from './src/screens/Home/LeagueChatScreen';
import DraftRoomScreen from './src/screens/Home/DraftRoomScreen';
import TeamRosterScreen from './src/screens/Home/TeamRosterScreen';
import CommunityFeedScreen from './src/screens/Community/CommunityFeedScreen';
import CreatePostScreen from './src/screens/Community/CreatePostScreen';
import PostDetailsScreen from './src/screens/Community/PostDetailsScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from './src/store';
import CoinStoreScreen from './src/screens/Profile/CoinStoreScreen';
import WalletScreen from './src/screens/Profile/WalletScreen';
import AllPostsScreen from './src/screens/Profile/AllPostsScreen';
import EditProfileScreen from './src/screens/Profile/EditProfileScreen';
import OrganizationPickerScreen from './src/screens/Profile/OrganizationPickerScreen';
import StatePickerScreen from './src/screens/Profile/StatePickerScreen';
import SettingsScreen from './src/screens/Profile/SettingsScreen';
import AboutUsScreen from './src/screens/Profile/AboutUsScreen';
import PrivacyPolicyScreen from './src/screens/Profile/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/Profile/TermsOfServiceScreen';
import AdminSupportScreen from './src/screens/Profile/AdminSupportScreen';
import { ToastContainer } from './src/components/common/Toast';
import { authService } from './src/services/authService';
import { AvatarConfig } from './src/avatar/types';
import DfsContestsScreen from './src/screens/DFS/DfsContestsScreen';
import DfsContestDetailScreen from './src/screens/DFS/DfsContestDetailScreen';
import DfsLineupScreen from './src/screens/DFS/DfsLineupScreen';
import AdminCheerScreen from './src/screens/Admin/AdminCheerScreen';
import AdminCheerFormScreen, {
  type AdminCheerStep,
} from './src/screens/Admin/AdminCheerFormScreen';
import CheerEventsScreen from './src/screens/Events/CheerEventsScreen';
import CheerEventDetailScreen from './src/screens/Events/CheerEventDetailScreen';
import NotificationScreen from './src/screens/Notification/NotificationScreen';

export type RootStackParamList = {
  Onboarding1: undefined;
  OnboardingCarousel: undefined;
  SignIn: undefined;
  CreateAccount: undefined;
  ForgotPassword: undefined;
  OTPVerification: undefined;
  ResetPassword: undefined;
  Notification: undefined;
  ExploreAvatar:
    | { returnTo?: keyof RootStackParamList; isAccountSetup?: boolean }
    | undefined;
  AvatarHistory: undefined;
  // `config` puts the editor in edit mode: the pickers open on that saved look
  // instead of on the first option in every slot. Absent means create mode.
  GenerateAvatar: {
    // No `baseImage`: the editor resolves the body from the catalogue and the
    // registry, so passing a bundled `require()` handle here would pin it to
    // the bundle.
    //
    // `baseId` is what identifies the body, and through it the character whose
    // wardrobe the editor scopes to. `avatarCategory` is gone: a category could
    // not tell two bodies apart once both carried the same number, and it is no
    // longer what decides which assets a body may wear.
    baseId?: string;
    isFullbody?: boolean;
    // Display and layout only - the editor sizes its stage from it.
    target?: 'female' | 'male';
    returnTo?: keyof RootStackParamList;
    isAccountSetup?: boolean;
    config?: AvatarConfig | null;
  };
  Home: undefined;
  FantasyLeague: undefined;
  DfsContests: undefined;
  DfsContestDetail: { contestId: string };
  DfsLineup: { contestId: string };
  CreateLeague: undefined;
  LeagueDetail: {
    leagueId: string;
    /** Tab to open on. Used when the draft finishes and hands over to play. */
    initialTab?: 'Matchup' | 'Draft' | 'Team' | 'Players' | 'League' | 'Scoring';
  };
  LeagueChat: { leagueId: string; leagueName?: string };
  DraftRoom: { leagueId: string };
  TeamRoster: { leagueId: string; teamId: string; teamName?: string };
  Community: undefined;
  CreatePost: undefined;
  PostDetails: { postId: string };
  Profile: undefined;
  CoinStore: undefined;
  Wallet: undefined;
  AllPosts: undefined;
  EditProfile: undefined;
  /**
   * Choosing a favourite gym or team. One screen for both, so `field` says
   * which one is being set - the two lists are otherwise identical and picking
   * the wrong one would be invisible.
   */
  OrganizationPicker: {
    field: 'favoriteOrganizationId' | 'favoriteTeamId';
    title: string;
    currentId?: string | null;
  };
  /** Choosing a US state. `currentCode` is the two-letter code, or null. */
  StatePicker: { currentCode?: string | null } | undefined;
  Settings: undefined;
  AboutUs: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  AdminSupport: undefined;
  AdminCheer: undefined;
  AdminCheerForm: { step: AdminCheerStep };
  CheerEvents: undefined;
  CheerEventDetail: { eventId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const dispatch = useDispatch();
  const {
    isAuthenticated,
    isInitializing,
    pendingAuthFlow,
    signedOutRoute,
    needsAvatarSetup,
  } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    authService.restoreSession(dispatch);
  }, [dispatch]);

  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#E0B566" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <NavigationContainer>
        {!isAuthenticated ? (
          // The pending-verification screens are mounted *instead of* the
          // signed-out ones rather than being selected with `initialRouteName`.
          // Remounting the navigator with a new `key` does not reset the stack:
          // the container holds the previous state, and because both trees are
          // stack routers `useNavigationBuilder` treats it as valid and
          // rehydrates it, so `initialRouteName` is never read and registering
          // left the user sitting on CreateAccount. Swapping the screen list
          // makes every mounted route invalid, which is the one thing
          // StackRouter does reset from.
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {pendingAuthFlow ? (
              <>
                <Stack.Screen
                  name="OTPVerification"
                  component={OTPVerificationScreen}
                />
                {pendingAuthFlow === 'passwordReset' && (
                  <Stack.Screen
                    name="ResetPassword"
                    component={ResetPasswordScreen}
                  />
                )}
              </>
            ) : (
              <>
                {signedOutRoute === 'Onboarding1' && (
                  <>
                    <Stack.Screen
                      name="Onboarding1"
                      component={OnboardingScreen}
                    />
                    <Stack.Screen
                      name="OnboardingCarousel"
                      component={OnboardingCarousel}
                    />
                  </>
                )}
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen
                  name="CreateAccount"
                  component={CreateAccountScreen}
                />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                />
              </>
            )}
          </Stack.Navigator>
        ) : (
          <Stack.Navigator
            key={needsAvatarSetup ? 'main-account-setup' : 'main'}
            initialRouteName={needsAvatarSetup ? 'ExploreAvatar' : 'Home'}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="FantasyLeague"
              component={FantasyLeagueScreen}
            />
            <Stack.Screen name="DfsContests" component={DfsContestsScreen} />
            <Stack.Screen
              name="DfsContestDetail"
              component={DfsContestDetailScreen}
            />
            <Stack.Screen name="DfsLineup" component={DfsLineupScreen} />
            <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
            <Stack.Screen name="LeagueDetail" component={LeagueDetailScreen} />
            <Stack.Screen name="LeagueChat" component={LeagueChatScreen} />
            <Stack.Screen name="DraftRoom" component={DraftRoomScreen} />
            <Stack.Screen name="TeamRoster" component={TeamRosterScreen} />
            <Stack.Screen name="Community" component={CommunityFeedScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="CoinStore" component={CoinStoreScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="AllPosts" component={AllPostsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen
              name="OrganizationPicker"
              component={OrganizationPickerScreen}
            />
            <Stack.Screen name="StatePicker" component={StatePickerScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AboutUs" component={AboutUsScreen} />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
            />
            <Stack.Screen
              name="TermsOfService"
              component={TermsOfServiceScreen}
            />
            <Stack.Screen name="AdminSupport" component={AdminSupportScreen} />
            <Stack.Screen name="AdminCheer" component={AdminCheerScreen} />
            <Stack.Screen
              name="AdminCheerForm"
              component={AdminCheerFormScreen}
            />
            <Stack.Screen name="CheerEvents" component={CheerEventsScreen} />
            <Stack.Screen
              name="CheerEventDetail"
              component={CheerEventDetailScreen}
            />
            <Stack.Screen
              name="Notification"
              component={NotificationScreen}
            />
            <Stack.Screen
              name="ExploreAvatar"
              component={ExploreAvatarScreen}
              initialParams={
                needsAvatarSetup
                  ? { returnTo: 'Home', isAccountSetup: true }
                  : undefined
              }
            />
            <Stack.Screen
              name="GenerateAvatar"
              component={GenerateAvatarScreen}
            />
            <Stack.Screen
              name="AvatarHistory"
              component={AvatarHistoryScreen}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
      <ToastContainer />
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
