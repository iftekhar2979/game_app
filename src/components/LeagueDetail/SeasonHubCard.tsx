import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeftRight, ChevronRight, Crown, Trophy, UserPlus } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * The League tab's way into the in-season screens.
 *
 * Trades and waivers act on a roster, so they need the viewer's team and an
 * active league; the championship race and the recap are readable by anyone
 * who can see the standings.
 */
export default function SeasonHubCard({
  leagueId,
  leagueStatus,
  fantasyTeamId,
}: {
  leagueId: string;
  /** The server's league status, not the tab's display label. */
  leagueStatus?: string | null;
  fantasyTeamId?: string | null;
}) {
  const navigation = useNavigation<NavigationProp>();
  const isActive = leagueStatus === 'active';
  const isComplete = leagueStatus === 'completed';
  if (!isActive && !isComplete) return null;

  const teamId = fantasyTeamId ?? undefined;
  const rows = [
    isActive && teamId
      ? {
          key: 'trades',
          label: 'Trades',
          detail: 'Offer and review cheer-team swaps',
          Icon: ArrowLeftRight,
          onPress: () => navigation.navigate('LeagueTrades', { leagueId, fantasyTeamId: teamId }),
        }
      : null,
    isActive && teamId
      ? {
          key: 'waivers',
          label: 'Waivers',
          detail: 'Claim unowned teams',
          Icon: UserPlus,
          onPress: () => navigation.navigate('LeagueWaivers', { leagueId, fantasyTeamId: teamId }),
        }
      : null,
    {
      key: 'championship',
      label: 'Championship',
      detail: 'Top 4 after Match 10 play the final',
      Icon: Trophy,
      onPress: () => navigation.navigate('LeagueChampionship', { leagueId, fantasyTeamId: teamId }),
    },
    isComplete
      ? {
          key: 'recap',
          label: 'Season recap',
          detail: 'Champion and final standings',
          Icon: Crown,
          onPress: () => navigation.navigate('SeasonRecap', { leagueId, fantasyTeamId: teamId }),
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <View className="bg-[#111] border border-[#222] rounded-[24px] px-4 py-2 mt-2 mb-4">
      {rows.map(({ key, label, detail, Icon, onPress }, index) => (
        <TouchableOpacity
          key={key}
          accessibilityRole="button"
          onPress={onPress}
          activeOpacity={0.8}
          className={`flex-row items-center py-3 ${index > 0 ? 'border-t border-[#1d1d1d]' : ''}`}
        >
          <View className="w-9 h-9 rounded-full bg-[#1e1a2b] items-center justify-center mr-3">
            <Icon color="#B366FF" size={18} />
          </View>
          <View className="flex-1">
            <Text className="text-white text-[14px] font-semibold">{label}</Text>
            <Text className="text-gray-500 text-[11px]">{detail}</Text>
          </View>
          <ChevronRight color="#666" size={18} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
