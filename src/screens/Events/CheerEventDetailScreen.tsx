import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  Medal,
  Shield,
  Users,
} from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import {
  useGetCheerCompetitionResultsQuery,
  useGetCheerEventEntriesQuery,
  useGetCheerEventQuery,
} from '../../store/api/cheerApi';

type Props = NativeStackScreenProps<RootStackParamList, 'CheerEventDetail'>;
const getId = (value: any) => String(value?._id ?? value?.id ?? value ?? '');
const humanize = (value?: string) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
const formatDateTime = (value?: string) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime())
    ? 'To be announced'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

export default function CheerEventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const eventQuery = useGetCheerEventQuery(eventId);
  const entriesQuery = useGetCheerEventEntriesQuery(eventId);
  const resultsQuery = useGetCheerCompetitionResultsQuery({
    competitionId: eventId,
  });
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        eventQuery.refetch(),
        entriesQuery.refetch(),
        resultsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [entriesQuery, eventQuery, resultsQuery]);

  const results = resultsQuery.data ?? [];
  const resultsByDivision = useMemo(
    () =>
      results.reduce<Record<string, any[]>>((groups, result) => {
        const key = getId(result.divisionId);
        (groups[key] ||= []).push(result);
        return groups;
      }, {}),
    [results],
  );

  if (eventQuery.isLoading)
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#E0B566" />
      </SafeAreaView>
    );
  if (eventQuery.error || !eventQuery.data)
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8">
        <Text className="text-white text-lg font-semibold">
          Event unavailable
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="border border-white/20 rounded-xl px-5 py-3 mt-5"
        >
          <Text className="text-white">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  const event = eventQuery.data;
  const entries = entriesQuery.data ?? [];
  const divisions = event.divisionIds ?? [];
  const location = [event.venue, event.city, event.country]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-white/20 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text
          className="text-white text-xl font-bold ml-4 flex-1"
          numberOfLines={1}
        >
          Event Details
        </Text>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#E0B566"
          />
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}
      >
        <View className="bg-[#21190f] border border-[#E0B566]/30 rounded-[24px] p-5 mb-5">
          <Text className="text-[#E0B566] text-xs font-bold">
            {humanize(event.status).toUpperCase()} · FANTASY PERIOD{' '}
            {event.fantasyPeriod}
          </Text>
          <Text className="text-white text-2xl font-extrabold mt-2">
            {event.name}
          </Text>
          <View className="flex-row items-center mt-4">
            <Shield color="#E0B566" size={17} />
            <Text className="text-gray-300 text-sm ml-2">
              {event.governingBody}
            </Text>
          </View>
          <View className="flex-row items-center mt-3">
            <CalendarDays color="#E0B566" size={17} />
            <Text className="text-gray-300 text-sm ml-2 flex-1">
              {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
            </Text>
          </View>
          {location ? (
            <View className="flex-row items-center mt-3">
              <MapPin color="#E0B566" size={17} />
              <Text className="text-gray-300 text-sm ml-2 flex-1">
                {location}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="text-white text-lg font-semibold mb-3">Divisions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
        >
          {divisions.map((division: any) => (
            <View
              key={getId(division)}
              className="bg-[#151515] border border-white/10 rounded-2xl px-4 py-3 mr-2"
            >
              <Text className="text-[#E0B566] font-bold">{division.code}</Text>
              <Text className="text-white text-sm mt-1">{division.name}</Text>
              <Text className="text-gray-500 text-xs mt-1">
                {division.ageGroup} · {division.level}
              </Text>
            </View>
          ))}
          {!divisions.length && (
            <Text className="text-gray-500">No divisions announced.</Text>
          )}
        </ScrollView>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-semibold">
            Competing teams
          </Text>
          <Text className="text-gray-500 text-xs">
            {entries.length} entries
          </Text>
        </View>
        {entries.map((entry: any) => (
          <View
            key={getId(entry)}
            className="bg-[#151515] border border-white/10 rounded-2xl p-4 mb-3 flex-row items-center"
          >
            <View className="w-10 h-10 bg-[#252525] rounded-xl items-center justify-center">
              <Users color="#E0B566" size={19} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-white font-semibold">{entry.teamName}</Text>
              <Text className="text-gray-500 text-xs mt-1">
                {entry.organizationId?.name || 'Cheer program'} ·{' '}
                {entry.rosterSnapshot?.length ?? 0} athletes
              </Text>
            </View>
            {entry.status === 'confirmed' && (
              <CheckCircle2 color="#22c55e" size={18} />
            )}
          </View>
        ))}
        {!entries.length && (
          <Text className="text-gray-500 mb-6">
            Entries have not been announced.
          </Text>
        )}

        <Text className="text-white text-lg font-semibold mb-3 mt-3">
          Official results
        </Text>
        {Object.entries(resultsByDivision).map(
          ([divisionId, divisionResults]) => {
            const division = divisions.find(
              (item: any) => getId(item) === divisionId,
            );
            return (
              <View
                key={divisionId}
                className="bg-[#151515] border border-white/10 rounded-2xl p-4 mb-4"
              >
                <Text className="text-[#E0B566] font-bold mb-3">
                  {division?.name || 'Division'}
                </Text>
                {divisionResults.map((result: any) => (
                  <View
                    key={getId(result)}
                    className="flex-row items-center py-2 border-t border-white/10"
                  >
                    <Medal
                      color={result.placement === 1 ? '#E0B566' : '#777'}
                      size={18}
                    />
                    <Text className="text-white font-semibold ml-3 w-8">
                      #{result.placement || '–'}
                    </Text>
                    <View className="flex-1">
                      <Text className="text-white">
                        {result.entryId?.teamName || 'Team'}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {humanize(result.round)}
                      </Text>
                    </View>
                    <Text className="text-[#E0B566] font-bold">
                      {Number(result.finalScore).toFixed(3)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          },
        )}
        {!results.length && (
          <View className="bg-[#111] border border-white/10 rounded-2xl p-5 items-center">
            <Medal color="#555" size={28} />
            <Text className="text-white mt-3">No official results yet</Text>
            <Text className="text-gray-500 text-xs text-center mt-1">
              Published judge scores will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
