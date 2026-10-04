import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTokens, lightTokens, ThemeTokens } from './palette';

/** What the user picked. `system` follows the OS. */
export type AppearancePreference = 'system' | 'light' | 'dark';
/** What that resolves to once the OS setting is taken into account. */
export type Appearance = 'light' | 'dark';

const PREFERENCE_KEY = '@cheerbattle/appearance';

interface ThemeContextValue {
  /** The resolved tokens for the current appearance. */
  theme: ThemeTokens;
  /** `light` or `dark` - never `system`. */
  appearance: Appearance;
  /** What the user chose, which may be `system`. */
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
  /** True until the stored preference has been read back. */
  isHydrating: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Supplies the colour tokens and owns the appearance preference.
 *
 * The preference is also pushed into NativeWind so `dark:` class variants agree
 * with `useTheme()`. Without that the two styling routes could disagree - a
 * screen could have a `dark:` background from one and an icon colour from the
 * other.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  // Defaults to the dark appearance the app shipped with, so the first frame
  // (before storage is read) is the one existing users already expect rather
  // than a flash of white.
  const [preference, setPreferenceState] = useState<AppearancePreference>('dark');
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(PREFERENCE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // A preference that cannot be read is not worth failing a launch over;
        // the default appearance stands.
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const appearance: Appearance =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  useEffect(() => {
    setColorScheme(preference);
  }, [preference, setColorScheme]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(PREFERENCE_KEY, next).catch(() => {
      // Losing the write only costs the choice on next launch, not this one.
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: appearance === 'light' ? lightTokens : darkTokens,
      appearance,
      preference,
      setPreference,
      isHydrating,
    }),
    [appearance, preference, setPreference, isHydrating],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The colour tokens for the current appearance. */
export function useTheme(): ThemeTokens {
  return useThemeContext().theme;
}

/** The full appearance control surface, for the Settings selector. */
export function useAppearance(): ThemeContextValue {
  return useThemeContext();
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
