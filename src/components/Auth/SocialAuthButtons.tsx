import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppleIcon, FacebookIcon, GoogleIcon } from '../Icons/SocialIcons';
import { IS_APPLE_SIGN_IN_SUPPORTED } from '../../config';
import {
  getSocialCredential,
  SocialProvider,
  SocialSignInCancelled,
} from '../../services/socialAuthService';
import { useSocialLoginMutation } from '../../store/api/authApi';
import { authService } from '../../services/authService';
import { AppDispatch } from '../../store';

type SocialAuthButtonsProps = {
  /** Section heading above the divider, e.g. "SignUp with Others". */
  label: string;
  /**
   * Terms acceptance to record when the sign-in creates a brand-new account.
   * The backend stores it verbatim, so pass the real checkbox state.
   */
  isTcPpAccepted?: boolean;
  /** Surfaces a failure to the host screen's toast. */
  onError: (title: string, message: string) => void;
  /** Blocks the buttons while the host screen is already submitting a form. */
  disabled?: boolean;
};

type ProviderConfig = {
  provider: SocialProvider;
  label: string;
  icon: React.ReactNode;
  /** Google's mark must sit on white; the others sit on the dark surface. */
  surface: string;
  border: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'google',
    label: 'Continue with Google',
    icon: <GoogleIcon size={24} />,
    surface: '#FFFFFF',
    border: '#FFFFFF',
  },
  {
    provider: 'apple',
    label: 'Continue with Apple',
    icon: <AppleIcon size={24} />,
    surface: 'rgba(0,0,0,0.4)',
    border: '#3A144E',
  },
  {
    provider: 'facebook',
    label: 'Continue with Facebook',
    icon: <FacebookIcon size={24} />,
    surface: 'rgba(0,0,0,0.4)',
    border: '#3A144E',
  },
];

/**
 * The Google / Apple / Facebook sign-in row.
 *
 * Each button runs the provider's native SDK, then posts the resulting
 * credential to `POST /auth/social/:provider`. Nothing about the user is taken
 * from the device - the backend verifies the token and decides whether this is
 * a new account, a returning one, or a link onto an existing email.
 */
const SocialAuthButtons = ({
  label,
  isTcPpAccepted,
  onError,
  disabled,
}: SocialAuthButtonsProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [socialLogin] = useSocialLoginMutation();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);

  // Apple offers no native flow on Android, so the button is hidden rather
  // than shown and failing on tap.
  const providers = PROVIDERS.filter(
    (item) => item.provider !== 'apple' || IS_APPLE_SIGN_IN_SUPPORTED,
  );

  const handlePress = async (provider: SocialProvider) => {
    if (pendingProvider || disabled) {
      return;
    }

    setPendingProvider(provider);
    try {
      const credential = await getSocialCredential(provider);

      const response = await socialLogin({
        provider,
        idToken: credential.idToken,
        accessToken: credential.accessToken,
        fullName: credential.fullName,
        isTcPpAccepted: isTcPpAccepted ?? true,
      }).unwrap();

      const data = response?.data;
      if (!data?.accessToken) {
        throw new Error('The server did not return a session.');
      }

      // A provider that would not vouch for the email address sends the user
      // through the same OTP screen as a password signup.
      if (data.isEmailVerified === false || !data.refreshToken) {
        await authService.handleVerificationRequired(dispatch, data.accessToken, {
          email: data.user?.email || credential.email,
          fullName: data.user?.fullName || credential.fullName,
        });
        return;
      }

      await authService.handleLoginSuccess(dispatch, data.accessToken, data.refreshToken, {
        id: data.user?.id,
        email: data.user?.email,
        fullName: data.user?.fullName,
        name: data.user?.fullName,
        role: data.user?.role,
        isEmailVerified: true,
        // A first-time social account has not built an avatar yet, so it goes
        // through the same first-run setup as a fresh email signup.
        needsAvatarSetup: data.isNewAccount === true,
      });
    } catch (error: any) {
      if (error instanceof SocialSignInCancelled) {
        return; // The user closed the provider sheet; not a failure.
      }
      onError(
        'Sign-in failed',
        error?.data?.message || error?.message || `Could not sign in with ${provider}.`,
      );
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <View className="px-6 my-6">
      <View className="flex-row items-center">
        <View className="flex-1 h-[1px] bg-[#3A144E]" />
        <Text className="text-[#FFB444] text-xs px-3 font-medium">{label}</Text>
        <View className="flex-1 h-[1px] bg-[#3A144E]" />
      </View>

      <View className="flex-row justify-center mt-6 gap-x-5">
        {providers.map((item) => {
          const isPending = pendingProvider === item.provider;
          return (
            <TouchableOpacity
              key={item.provider}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              disabled={disabled || pendingProvider !== null}
              onPress={() => handlePress(item.provider)}
              activeOpacity={0.8}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: item.border,
                backgroundColor: item.surface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled || (pendingProvider && !isPending) ? 0.5 : 1,
              }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={item.provider === 'google' ? '#4285F4' : '#FFB444'} />
              ) : (
                item.icon
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default SocialAuthButtons;
