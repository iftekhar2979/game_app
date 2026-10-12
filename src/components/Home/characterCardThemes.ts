import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Looks for the home screen's character card. Each is a dark card lit by one
 * neon colour: a glow behind the figure and a lit floor ring under its feet.
 */
export interface CharacterCardTheme {
  key: string;
  label: string;
  background: string;
  border: string;
  /** The glow behind the figure and the floor's halo. */
  glow: string;
  /** The crisp floor ring and the picker swatch. */
  neon: string;
}

export const CHARACTER_CARD_THEMES: CharacterCardTheme[] = [
  { key: 'violet', label: 'Violet', background: '#110c1b', border: '#4b2f78', glow: '#8B3DFF', neon: '#C084FC' },
  { key: 'cyber', label: 'Cyber Blue', background: '#08111d', border: '#1d4a72', glow: '#0EA5E9', neon: '#67E8F9' },
  { key: 'inferno', label: 'Inferno', background: '#170d08', border: '#6e361b', glow: '#F97316', neon: '#FDBA74' },
  { key: 'toxic', label: 'Toxic', background: '#08150e', border: '#1d6038', glow: '#22C55E', neon: '#86EFAC' },
  { key: 'pink', label: 'Hot Pink', background: '#170914', border: '#6e1d52', glow: '#EC4899', neon: '#F9A8D4' },
];

export const DEFAULT_CHARACTER_CARD_THEME = CHARACTER_CARD_THEMES[0];

export function characterCardThemeOf(key?: string | null): CharacterCardTheme {
  return CHARACTER_CARD_THEMES.find((theme) => theme.key === key) ?? DEFAULT_CHARACTER_CARD_THEME;
}

/*
 * The chosen look is one device-wide setting shared by the home card and the
 * avatar editor, so a change in either shows in the other straight away.
 */
const STORAGE_KEY = 'home:characterCardTheme';
let current: CharacterCardTheme = DEFAULT_CHARACTER_CARD_THEME;
let loaded = false;
const listeners = new Set<(theme: CharacterCardTheme) => void>();

function publish(theme: CharacterCardTheme) {
  current = theme;
  listeners.forEach((listener) => listener(theme));
}

export function useCharacterCardTheme(): [CharacterCardTheme, (theme: CharacterCardTheme) => void] {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    listeners.add(setTheme);
    // Catch up on a change made between this render and subscribing.
    setTheme(current);
    if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(STORAGE_KEY)
        .then((key) => publish(characterCardThemeOf(key)))
        .catch(() => {});
    }
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  const choose = useCallback((next: CharacterCardTheme) => {
    publish(next);
    AsyncStorage.setItem(STORAGE_KEY, next.key).catch(() => {});
  }, []);

  return [theme, choose];
}
