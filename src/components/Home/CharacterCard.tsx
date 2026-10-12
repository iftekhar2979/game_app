import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight, Palette, Star } from 'lucide-react-native';

import AvatarPreview from '../common/AvatarPreview';
import { AvatarConfig } from '../../avatar/types';
import { ArtworkCatalogue } from '../../avatar/assetSource';
import { CharacterCardTheme, useCharacterCardTheme } from './characterCardThemes';
import { NeonStage, ThemeSwatches } from './NeonStage';

/**
 * The card's total height is fixed, so the avatar can only grow by taking space
 * from the rest of the card, never by making the card taller. This matches the
 * earlier card: 300pt avatar area plus label and info block.
 */
const CARD_HEIGHT = Math.min(300, Dimensions.get('window').height * 0.34) + 172;
/** Space under the feet for the floor ring; the name sits just below it. */
const FLOOR_DROP = 12;

interface CharacterCardProps {
  name: string;
  level: number;
  totalXp: number;
  /** 0-100 through the current level. */
  xpPercent: number;
  config?: AvatarConfig | null;
  catalogue?: ArtworkCatalogue;
  fallbackUri?: string | null;
  onPressAvatar: () => void;
  onCustomize: () => void;
}

export default function CharacterCard({
  name,
  level,
  totalXp,
  xpPercent,
  config,
  catalogue,
  fallbackUri,
  onPressAvatar,
  onCustomize,
}: CharacterCardProps) {
  const [theme, setTheme] = useCharacterCardTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Measured, because the info block's height depends on font scaling.
  const [stageHeight, setStageHeight] = useState(0);

  const chooseTheme = (next: CharacterCardTheme) => {
    setTheme(next);
    setPickerOpen(false);
  };

  return (
    <View
      style={[
        styles.card,
        { height: CARD_HEIGHT, backgroundColor: theme.background, borderColor: theme.border },
      ]}
    >
      <View
        style={styles.stage}
        onLayout={(e) => setStageHeight(Math.round(e.nativeEvent.layout.height))}
      >
        {stageHeight > 0 && (
          <>
            <NeonStage theme={theme} floorY={stageHeight - FLOOR_DROP} idPrefix="homeCard" />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              activeOpacity={0.9}
              onPress={onPressAvatar}
            >
              <AvatarPreview
                config={config}
                height={stageHeight - FLOOR_DROP + 2}
                framed={false}
                fallbackUri={fallbackUri}
                fallbackName={name}
                catalogue={catalogue}
                fill
              />
            </TouchableOpacity>
          </>
        )}

        {/* In the corners rather than above the head, so the figure can use
            the card's full height. */}
        <View style={styles.label} pointerEvents="none">
          <Star color={theme.neon} fill={theme.neon} size={9} />
          <Text style={styles.labelText}>YOUR CHARACTER</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Change card style"
          style={styles.paletteButton}
          onPress={() => setPickerOpen((open) => !open)}
        >
          <Palette color="#e5e7eb" size={16} />
        </TouchableOpacity>

        {pickerOpen && (
          <ThemeSwatches
            value={theme}
            onChange={chooseTheme}
            direction="column"
            style={styles.picker}
          />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.level}>
          Level {level} • {totalXp.toLocaleString()} XP
        </Text>

        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${Math.max(xpPercent, 2)}%` }]}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="cc_xp" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#3B82F6" />
                  <Stop offset="1" stopColor="#F59E3B" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx="4" fill="url(#cc_xp)" />
            </Svg>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Customize avatar"
          style={styles.customize}
          activeOpacity={0.8}
          onPress={onCustomize}
        >
          <View style={[styles.bracket, styles.bracketLeft]} />
          <Text style={styles.customizeText}>Customize Avatar</Text>
          <ArrowRight color="#F5A04A" size={15} />
          <View style={[styles.bracket, styles.bracketRight]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stage: {
    flex: 1,
  },
  label: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    color: '#d1d5db',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginLeft: 5,
  },
  paletteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  picker: {
    position: 'absolute',
    top: 46,
    right: 8,
    padding: 6,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 10, 12, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  info: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  name: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '800',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  level: {
    color: '#9ca3af',
    fontSize: 13,
  },
  xpTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
    backgroundColor: '#2a2630',
  },
  xpFill: {
    height: '100%',
  },
  customize: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  customizeText: {
    color: '#F5A04A',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  // The "[ Customize Avatar -> ]" brackets.
  bracket: {
    width: 6,
    height: 22,
    borderColor: '#F5A04A',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  bracketLeft: {
    borderLeftWidth: 1.5,
  },
  bracketRight: {
    borderRightWidth: 1.5,
    marginLeft: 12,
  },
});
