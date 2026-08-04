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
    resendOtp: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/resend-otp',
        method: 'POST',
      }),
    }),
  }),
});

export const { useRegisterMutation, useVerifyEmailMutation, useResendOtpMutation } = authApi;
