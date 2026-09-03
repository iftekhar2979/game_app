import React from 'react';
import Svg, { Path } from 'react-native-svg';

type BrandIconProps = {
  size?: number;
  /** Overrides the brand colour. Ignored by Google, whose mark is four-colour. */
  color?: string;
};

/**
 * Official brand marks for the social sign-in buttons, drawn as vectors so they
 * stay crisp at any size and need no image assets in the bundle.
 *
 * The geometry is each provider's published logo and must not be restyled:
 * Google, Apple and Meta all require their mark to keep its own colours and
 * proportions in a sign-in button.
 */

/** Google "G" - four-colour mark on its own, meant to sit on a white surface. */
export const GoogleIcon = ({ size = 22 }: BrandIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      fill="#4285F4"
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
    />
    <Path
      fill="#34A853"
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
    />
    <Path
      fill="#FBBC05"
      d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
    />
    <Path
      fill="#EA4335"
      d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
    />
  </Svg>
);

/** Apple mark. Monochrome by design - white on the app's dark surfaces. */
export const AppleIcon = ({ size = 22, color = '#FFFFFF' }: BrandIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
    />
  </Svg>
);

/** Meta's "f" mark, in Facebook blue. */
export const FacebookIcon = ({ size = 22, color = '#1877F2' }: BrandIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07z"
    />
  </Svg>
);
