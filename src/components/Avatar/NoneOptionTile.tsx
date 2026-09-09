import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ban } from 'lucide-react-native';

import { TILE_FRAME } from '../../avatar/tileCrop';

/**
 * An explicit "none" choice at the head of a picker.
 *
 * The skin-tone picker used to have no such option: its single tile toggled on
 * a second tap, so clearing a choice meant re-tapping the thing you had already
 * chosen, and with one asset in the list there was nothing that read as a
 * choice at all. Making "none" a tile of its own turns the row into a real
 * selection - none, or one of the tones - and gives the current state somewhere
 * to show.
 */
interface NoneOptionTileProps {
  isSelected: boolean;
  onSelect: () => void;
  label?: string;
  accessibilityLabel: string;
}

export default function NoneOptionTile({
  isSelected,
  onSelect,
  label = 'None',
  accessibilityLabel,
}: NoneOptionTileProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className="mr-3 items-center"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
      onPress={onSelect}
    >
      <View
        className={`${TILE_FRAME} rounded-xl border-2 ${
          isSelected ? 'border-[#B366FF]' : 'border-[#5B1F7D]'
        } bg-[#1A0B2E] items-center justify-center`}
      >
        <Ban color={isSelected ? '#B366FF' : '#7A5AA0'} size={26} />
        <Text
          className={`${
            isSelected ? 'text-[#B366FF]' : 'text-[#7A5AA0]'
          } text-[11px] font-semibold mt-1.5`}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
