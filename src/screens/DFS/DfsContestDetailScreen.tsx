import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, DollarSign, Users } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  useGetDfsContestQuery,
  useGetMyDfsEntryQuery,
} from '../../store/api/dfsApi';
import {
  getContestJoinMessage,
  getDfsErrorMessage,
  isDfsEntryMissing,
} from '../../utils/dfsLineup';

type Props = NativeStackScreenProps<RootStackParamList, 'DfsContestDetail'>;

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
};

export default function DfsContestDetailScreen({ navigation, route }: Props) {
  const { contestId } = route.params;
  const contestQuery = useGetDfsContestQuery(contestId);
  const entryQuery = useGetMyDfsEntryQuery(contestId);
  const entryMissing = isDfsEntryMissing(entryQuery.error);

  if (contestQuery.isLoading || entryQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#E0B566" />
      </SafeAreaView>
    );
  }

  if (contestQuery.error || !contestQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-5 py-3">
          <TouchableOpacity
            className="w-11 h-11 rounded-xl border border-[#333] items-center justify-center"
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-lg font-bold">
            Contest unavailable
          </Text>
          <Text className="text-gray-400 text-sm text-center mt-2">
            {getDfsErrorMessage(
              contestQuery.error,
              'This contest is no longer available.',
            )}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const contest = contestQuery.data;
  const hasEntry = Boolean(entryQuery.data);
  const entryLoadFailed = Boolean(entryQuery.error && !entryMissing);
  const joinMessage = getContestJoinMessage(contest, hasEntry);
  const event =
    typeof contest.eventId === 'object' ? contest.eventId : undefined;
  const slotCount = contest.lineupSlots.reduce(
    (total, slot) => total + slot.count,
    0,
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-[#333] bg-[#121212] items-center justify-center mr-4"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text
          className="text-white text-[20px] font-bold flex-1"
          numberOfLines={1}
        >
          Contest
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View className="bg-[#17121f] border border-[#5b387e] rounded-[24px] p-5 mb-5">
          <Text className="text-[#E0B566] text-xs font-bold uppercase">
            {contest.status} ·{' '}
            {contest.type === 'free' ? 'Free to play' : 'Paid contest'}
          </Text>
          <Text className="text-white text-2xl font-extrabold mt-2">
            {contest.title}
          </Text>
          {event?.name ? (
            <Text className="text-gray-300 text-sm mt-2">{event.name}</Text>
          ) : null}
        </View>

        <View className="bg-[#121212] border border-[#2d2d2d] rounded-[20px] p-5 mb-4">
          <View className="flex-row items-center mb-4">
            <Clock color="#E0B566" size={20} />
            <View className="ml-3 flex-1">
              <Text className="text-gray-500 text-[10px] uppercase">
                Lineups lock
              </Text>
              <Text className="text-white text-sm font-semibold mt-1">
                {formatDate(contest.lockTime)}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center mb-4">
            <Users color="#E0B566" size={20} />
            <View className="ml-3 flex-1">
              <Text className="text-gray-500 text-[10px] uppercase">
                Contest players
              </Text>
              <Text className="text-white text-sm font-semibold mt-1">
                {contest.entrantCount} of {contest.maxEntrants} joined
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <DollarSign color="#E0B566" size={20} />
            <View className="ml-3 flex-1">
              <Text className="text-gray-500 text-[10px] uppercase">
                Your lineup
              </Text>
              <Text className="text-white text-sm font-semibold mt-1">
                {slotCount} spots · {contest.salaryCap} salary cap
              </Text>
            </View>
          </View>
        </View>

        {hasEntry ? (
          <View className="bg-emerald-400/10 border border-emerald-400/30 rounded-2xl p-4 mb-4">
            <Text className="text-emerald-400 font-bold">
              Your lineup is saved!
            </Text>
            <Text className="text-gray-300 text-xs mt-1">
              You can view it anytime and edit it before the contest starts.
            </Text>
          </View>
        ) : joinMessage ? (
          <View className="bg-[#211b13] border border-[#70572c] rounded-2xl p-4 mb-4">
            <Text className="text-[#E0B566] font-bold">{joinMessage}</Text>
          </View>
        ) : null}

        {entryLoadFailed ? (
          <View className="bg-[#281717] border border-[#6c3030] rounded-2xl p-4 mb-4">
            <Text className="text-rose-300 text-sm">
              We could not check your lineup. Please try again.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${
            entryLoadFailed || (!hasEntry && joinMessage)
              ? 'bg-[#333]'
              : 'bg-[#8B3DFF]'
          }`}
          disabled={entryLoadFailed || Boolean(!hasEntry && joinMessage)}
          onPress={() => navigation.navigate('DfsLineup', { contestId })}
        >
          <Text className="text-white text-base font-extrabold">
            {hasEntry ? 'View My Lineup' : 'Build My Lineup'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
