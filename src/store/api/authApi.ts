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
    resendOtp: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/resend-otp',
        method: 'POST',
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

export const { useRegisterMutation, useVerifyEmailMutation, useResendOtpMutation, useLoginMutation } = authApi;
