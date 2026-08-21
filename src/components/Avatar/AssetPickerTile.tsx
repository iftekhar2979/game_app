import React from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { AssetState } from '../../avatar/useAssetCatalogue';

/**
 * One asset in the editor's pickers.
 *
 * The five pickers used to each carry their own copy of this markup, which is
 * why the price tag existed as commented-out JSX in all of them. Sharing one
 * tile is what lets locked, retired and unknown states appear consistently
 * instead of five times over.
 *
 * The artwork always draws, whatever the catalogue says. Availability only ever
 * gates the *tap*.
 */

interface AssetPickerTileProps {
  source: any;
  /**
   * Per-slot zoom and offset. Part artwork sits on a full-body canvas, so hair
   * and shoes need different crops; these are the editor's existing values.
   */
  imageClassName: string;
  state: AssetState;
  isSelected: boolean;
  onSelect: () => void;
  /** Called for a locked asset. The backend performs the actual transaction. */
  onPurchase: () => void;
  /** Explains why a tap did nothing, for retired and unknown assets. */
  onBlocked: () => void;
  isPurchasing?: boolean;
  accessibilityLabel: string;
}

export default function AssetPickerTile({
  source,
  imageClassName,
  state,
  isSelected,
  onSelect,
  onPurchase,
  onBlocked,
  isPurchasing = false,
  accessibilityLabel,
}: AssetPickerTileProps) {
  const { availability, price } = state;
  const isLocked = availability === 'locked';
  const isDimmed = availability !== 'available';

  const handlePress = () => {
    if (isPurchasing) return;
    if (state.isSelectable) return onSelect();
    if (isLocked) return onPurchase();
    onBlocked();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className="mr-3 items-center"
      onPress={handlePress}
      disabled={isPurchasing}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected, disabled: !state.isSelectable && !isLocked }}
    >
      <View
        className={`w-[72px] h-[90px] rounded-xl border overflow-hidden items-center ${
          isSelected ? 'border-[#B366FF] border-2' : 'border-[#5B1F7D]'
        } bg-[#1A0B2E]`}
      >
        <Image
          source={source}
          className={imageClassName}
          resizeMode="contain"
          // Dimmed rather than hidden: the user should still see what it is.
          style={isDimmed ? { opacity: 0.35 } : undefined}
        />

        {availability === 'retired' && (
          <View className="absolute inset-0 items-center justify-center">
            <View className="bg-black/70 px-1.5 py-0.5 rounded">
              <Text className="text-[#B9B0C9] text-[8px] font-bold">RETIRED</Text>
            </View>
          </View>
        )}

        {isLocked && !isPurchasing && (
          <View className="absolute inset-0 items-center justify-center">
            <Lock color="#E6D9FF" size={18} />
          </View>
        )}

        {isPurchasing && (
          <View className="absolute inset-0 items-center justify-center bg-black/50">
            <ActivityIndicator size="small" color="#B366FF" />
          </View>
        )}

        {availability === 'loading' && (
          <View className="absolute inset-0 items-center justify-center bg-black/30" />
        )}
      </View>

      {/* The coin pill this design always intended, now driven by real data
          rather than the hardcoded 224 that used to sit here. */}
      {isLocked && (
        <View className="flex-row items-center bg-[#B366FF] px-2 py-0.5 rounded-full border border-[#3A144E] -mt-2">
          <Text className="text-[10px]">🪙</Text>
          <Text className="text-white text-[10px] font-bold ml-1">{price}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
