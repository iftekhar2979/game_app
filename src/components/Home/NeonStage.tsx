import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Check } from 'lucide-react-native';

import { CHARACTER_CARD_THEMES, CharacterCardTheme } from './characterCardThemes';

interface NeonStageProps {
  theme: CharacterCardTheme;
  /** Where the feet touch down, in px from the top of the stage. */
  floorY: number;
  /** Prefix for SVG ids, which are global: two stages on screen must differ. */
  idPrefix: string;
}

/**
 * The lit set a character stands in: a beam from above, a glow behind the
 * figure and a neon floor ring centred on `floorY`. Draw the figure after this
 * so its feet sit on top of the ring.
 */
export function NeonStage({ theme, floorY, idPrefix }: NeonStageProps) {
  // The theme key is in every id: Android caches gradients by id and would
  // otherwise keep painting the previous colour.
  const id = (part: string) => `${idPrefix}_${part}_${theme.key}`;

  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <RadialGradient id={id('glow')} cx="50%" cy="48%" rx="55%" ry="45%">
          <Stop offset="0" stopColor={theme.glow} stopOpacity="0.42" />
          <Stop offset="0.5" stopColor={theme.glow} stopOpacity="0.12" />
          <Stop offset="1" stopColor={theme.glow} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={id('beam')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.neon} stopOpacity="0.16" />
          <Stop offset="1" stopColor={theme.neon} stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id={id('halo')} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={theme.neon} stopOpacity="0.75" />
          <Stop offset="0.45" stopColor={theme.glow} stopOpacity="0.35" />
          <Stop offset="1" stopColor={theme.glow} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={id('shadow')} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id('glow')})`} />
      <Rect x="30%" y="0" width="40%" height={floorY} fill={`url(#${id('beam')})`} />
      <Ellipse cx="50%" cy={floorY} rx="46%" ry={26} fill={`url(#${id('halo')})`} />
      <Ellipse
        cx="50%"
        cy={floorY}
        rx="27%"
        ry={10}
        fill="none"
        stroke={theme.neon}
        strokeWidth={1.6}
        strokeOpacity={0.95}
      />
      <Ellipse cx="50%" cy={floorY - 1} rx="13%" ry={5} fill={`url(#${id('shadow')})`} />
    </Svg>
  );
}

interface ThemeSwatchesProps {
  value: CharacterCardTheme;
  onChange: (theme: CharacterCardTheme) => void;
  direction?: 'row' | 'column';
  style?: ViewStyle;
}

/** One neon dot per look; the chosen one is ringed and ticked. */
export function ThemeSwatches({ value, onChange, direction = 'row', style }: ThemeSwatchesProps) {
  return (
    <View style={[{ flexDirection: direction }, style]}>
      {CHARACTER_CARD_THEMES.map((option) => {
        const selected = option.key === value.key;
        return (
          <TouchableOpacity
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} background`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[
              styles.swatch,
              direction === 'row' ? styles.swatchRow : styles.swatchColumn,
              { backgroundColor: option.glow, shadowColor: option.neon },
              selected && styles.swatchSelected,
            ]}
          >
            {selected && <Check color="#fff" size={13} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  swatchRow: {
    marginHorizontal: 6,
  },
  swatchColumn: {
    marginVertical: 3,
  },
  swatchSelected: {
    borderColor: '#fff',
  },
});
