import React from 'react';
import { Text, View } from 'react-native';
import {
  FANTASY_SCORE_DIVISOR,
  GRAND_CHAMPION_BONUS,
  HIT_ZERO_BONUS,
} from '../../utils/cheerScoring';

const Rule = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between border-b border-[#222] px-4 py-3">
    <Text className="text-gray-300 text-[13px] flex-1 mr-3">{label}</Text>
    <Text className="text-[#4CAF50] text-[14px] font-bold">{value}</Text>
  </View>
);

export const FixedScoringRulesList = () => (
  <View className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden mb-6">
    <Rule label="Official event score" value="Actual score" />
    <Rule label="Hit zero deductions" value={`+${HIT_ZERO_BONUS}`} />
    <Rule label="Teams beaten in the division" value="+1 each" />
    <Rule label="Grand Champion" value={`+${GRAND_CHAMPION_BONUS}`} />
    <View className="px-4 py-4">
      <Text className="text-white font-semibold">Final fantasy score</Text>
      <Text className="text-gray-400 text-[12px] leading-5 mt-1">
        (Event score + zero deduction bonus + teams beaten bonus + Grand Champion bonus) / {FANTASY_SCORE_DIVISOR}
      </Text>
      <Text className="text-gray-400 text-[12px] leading-5 mt-1">
        Example: (98.1 + 1 + 3 + 0) / 10 = 10.21
      </Text>
    </View>
  </View>
);

export const ScoringRulesTab = () => (
  <View className="mb-4 mt-2">
    <Text className="text-white text-[15px] font-bold mb-2">Fantasy scoring</Text>
    <FixedScoringRulesList />
  </View>
);
