import { baseApi } from './baseApi';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  isTcPpAccepted: boolean;
}

export interface RegisterResponse {
  message: string;
  data: {
    userId: string;
    accessToken: string;
  };
}

/**
 * `POST /auth/social/:provider`. The provider is a path segment, not part of
 * the body, so it is carried alongside the credential and stripped by `query`.
 */
export interface SocialLoginRequest {
  provider: 'google' | 'apple' | 'facebook';
  /** Google and Apple. */
  idToken?: string;
  /** Facebook. */
  accessToken?: string;
  /** Apple only shares the display name on the first authorization. */
  fullName?: string;
  isTcPpAccepted?: boolean;
  deviceId?: string;
  fcmToken?: string;
}

export interface SocialLoginResponse {
  message: string;
  data: {
    accessToken: string;
    /** Absent when the account still has to verify its email by OTP. */
    refreshToken?: string;
    isEmailVerified?: boolean;
    isNewAccount?: boolean;
    provider?: string;
    user?: {
      id: string;
      email: string;
      fullName: string;
      role: string;
    };
  };
}

export interface ForgotPasswordResponse {
  message: string;
  data?: { accessToken?: string };
}

export interface VerifyEmailRequest {
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
  data?: {
    resetPasswordToken?: string;
  };
}

export const authApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
    verifyEmail: builder.mutation<VerifyEmailResponse, VerifyEmailRequest>({
      query: (data) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body: data,
      }),
    }),
    forgotPassword: builder.mutation<ForgotPasswordResponse, { email: string }>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    /** Change a signed-in account's password; `oldPassword` is re-checked. */
    changePassword: builder.mutation<
      { message: string },
      { oldPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<
      { message: string },
      { resetPasswordToken: string; newPassword: string }
    >({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
    socialLogin: builder.mutation<SocialLoginResponse, SocialLoginRequest>({
      query: ({ provider, ...credential }) => ({
        url: `/auth/social/${provider}`,
        method: 'POST',
        body: credential,
      }),
    }),
    login: builder.mutation<any, any>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useSocialLoginMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useLoginMutation,
} = authApi;
