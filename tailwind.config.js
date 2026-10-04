/** @type {import('tailwindcss').Config} */

// Kept in step with src/theme/palette.ts. NativeWind v2 compiles styles at
// build time and has no CSS variables, so a token cannot resolve per-appearance
// on its own - each semantic name exists as a light value plus a `*-dark`
// counterpart, used as `bg-surface dark:bg-surface-dark`.
//
// `useTheme()` is the primary route and covers what className cannot reach:
// icon `color` props, StatusBar, RefreshControl tints, ActivityIndicator.
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- Legacy names, still referenced by unconverted screens ----------
        primary: '#A63A84',
        background: '#000000',
        textPrimary: '#FFFFFF',
        textSecondary: '#A3A3A3',
        backgroundSecondary: '#7A29AF',

        // --- Semantic tokens: light value + dark counterpart ----------------
        surface: '#F6F2FB',
        'surface-dark': '#0E0618',
        'surface-elevated': '#FFFFFF',
        'surface-elevated-dark': '#140A24',
        'surface-sunken': '#EFE8F7',
        'surface-sunken-dark': '#1A0B2E',

        'content-primary': '#150920',
        'content-primary-dark': '#FFFFFF',
        'content-secondary': '#5C5169',
        'content-secondary-dark': '#A79BB8',
        'content-muted': '#8B8095',
        'content-muted-dark': '#7A5AA0',

        edge: '#E4D9F0',
        'edge-dark': '#3A144E',
        'edge-strong': '#C3AEDC',
        'edge-strong-dark': '#5B1F7D',

        accent: '#7126D6',
        'accent-dark': '#8B3DFF',
        gold: '#9A6308',
        'gold-dark': '#FFB444',
        danger: '#C62828',
        'danger-dark': '#D32F2F',
      },
    },
  },
  plugins: [],
};
