import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { User } from 'lucide-react-native';
import type { RosterPlayer } from '../../store/api/leagueApi';

/** A single real-world cheer team on a fantasy roster. */
export const RosterPlayerRow = ({
  player,
  onPress,
}: {
  player: RosterPlayer;
  onPress?: (player: RosterPlayer) => void;
}) => {
  const isStarter = player.lineupStatus === 'starter';
  const division =
    player.division ||
    player.assignedPosition ||
    player.positionCode ||
    player.eligiblePositions
      ?.map(position => position.name || position.code)
      .filter(Boolean)
      .join(' / ');
  const country = player.country || player.realTeam || player.nflTeam;
  const subtitle = [country, division].filter(Boolean).join(' • ');

  const Row = onPress ? TouchableOpacity : View;

  return (
    <Row
      className="flex-row items-center justify-between border-b border-[#222] pb-3 mb-3"
      activeOpacity={0.7}
      onPress={onPress ? () => onPress(player) : undefined}
    >
      <View className="flex-row items-center flex-1">
        {player.photoUrl ? (
          <Image
            source={{ uri: player.photoUrl }}
            className="w-10 h-10 rounded-full mr-3 bg-[#333]"
          />
        ) : (
          <View className="w-10 h-10 rounded-full mr-3 bg-[#222] border border-[#333] justify-center items-center">
            <User color="#666" size={18} />
          </View>
        )}
        <View className="flex-1">
          <Text
            className="text-white text-[14px] font-semibold"
            numberOfLines={1}
          >
            {player.name}
          </Text>
          <Text className="text-gray-400 text-[11px]">
            {subtitle || 'Team details unavailable'}
          </Text>
        </View>
      </View>

      {isStarter ? (
        <View className="bg-emerald-950 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
          <Text className="text-emerald-400 text-[10px] font-bold">
            Starter
          </Text>
        </View>
      ) : (
        <View className="bg-[#222] border border-[#333] px-2.5 py-0.5 rounded-full">
          <Text className="text-gray-400 text-[10px] font-medium">Bench</Text>
        </View>
      )}
    </Row>
  );
};

/** Starting + reserve real-world teams on one fantasy roster. */
export const RosterSections = ({
  starters,
  bench,
  onSelectPlayer,
}: {
  starters: RosterPlayer[];
  bench: RosterPlayer[];
  onSelectPlayer?: (player: RosterPlayer) => void;
}) => (
  <>
    <Text className="text-[#E0B566] text-[13px] font-bold uppercase mb-3 tracking-wider">
      Starting teams
    </Text>
    {starters.length > 0 ? (
      starters.map((player, idx) => (
        <RosterPlayerRow
          key={
            player.ownershipId
              ? `${player.ownershipId}-${idx}`
              : `starter-${idx}`
          }
          player={player}
          onPress={onSelectPlayer}
        />
      ))
    ) : (
      <Text className="text-gray-500 text-[12px] italic mb-4">
        No starting teams assigned yet.
      </Text>
    )}

    <Text className="text-gray-400 text-[13px] font-bold uppercase mt-2 mb-3 tracking-wider">
      Reserve teams
    </Text>
    {bench.length > 0 ? (
      bench.map((player, idx) => (
        <RosterPlayerRow
          key={
            player.ownershipId ? `${player.ownershipId}-${idx}` : `bench-${idx}`
          }
          player={player}
          onPress={onSelectPlayer}
        />
      ))
    ) : (
      <Text className="text-gray-500 text-[12px] italic">
        No reserve teams yet.
      </Text>
    )}
  </>
);
