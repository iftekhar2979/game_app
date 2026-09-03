import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Plus } from 'lucide-react-native';

interface LeagueCreationCallToActionProps {
  onPress: () => void;
}

export default function LeagueCreationCallToAction({
  onPress,
}: LeagueCreationCallToActionProps) {
  return (
    <TouchableOpacity
      testID="create-cheer-battle-league"
      accessibilityRole="button"
      accessibilityLabel="Create Cheer Battle League"
      className="mx-5 mb-4 flex-row items-center rounded-2xl border border-[#B366FF] bg-[#8B3DFF] px-4 py-3.5"
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/15">
        <Plus color="#fff" size={22} strokeWidth={2.5} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-white">
          Create Cheer Battle League
        </Text>
        <Text className="mt-0.5 text-[11px] text-white/75">
          Draft real-world cheer teams and compete with friends.
        </Text>
      </View>
    </TouchableOpacity>
  );
}
