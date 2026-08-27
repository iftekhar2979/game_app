import React, { useMemo, useState } from 'react';
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
  ChevronLeft,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import {
  CheerCompetition,
  useGetCheerCompetitionsQuery,
} from '../../store/api/cheerApi';

type Props = NativeStackScreenProps<RootStackParamList, 'CheerEvents'>;
type Filter = 'all' | 'upcoming' | 'live' | 'completed';

const getId = (value: any) => String(value?._id ?? value?.id ?? '');
const humanize = (value?: string) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date to be announced'
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
};

const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Results' },
];

export default function CheerEventsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const {
    data = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCheerCompetitionsQuery({});
  const events = useMemo(
    () =>
      data.filter(event => {
        if (filter === 'all') return true;
        if (filter === 'upcoming')
          return ['registration_open', 'registration_closed'].includes(
            event.status,
          );
        return event.status === filter;
      }),
    [data, filter],
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-white/20 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="ml-4 flex-1">
          <Text className="text-white text-[22px] font-bold">Cheer Events</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Real competitions and official results
          </Text>
        </View>
      </View>

      <View className="pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {filters.map(item => {
            const active = item.value === filter;
            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setFilter(item.value)}
                className={`mr-2 px-4 py-2.5 rounded-full border ${
                  active
                    ? 'bg-[#E0B566] border-[#E0B566]'
                    : 'bg-[#151515] border-white/15'
                }`}
              >
                <Text
                  className={
                    active ? 'text-black font-semibold' : 'text-gray-300'
                  }
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E0B566" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-lg font-semibold">
            Events are unavailable
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            We could not load the competition calendar.
          </Text>
          <TouchableOpacity
            className="bg-[#E0B566] rounded-xl px-6 py-3 mt-5"
            onPress={refetch}
          >
            <Text className="text-black font-semibold">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#E0B566"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}
        >
          {events.map((event: CheerCompetition) => {
            const location = [
              event.venue,
              (event as any).city,
              (event as any).country,
            ]
              .filter(Boolean)
              .join(' · ');
            const live = event.status === 'live';
            return (
              <TouchableOpacity
                key={getId(event)}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('CheerEventDetail', {
                    eventId: getId(event),
                  })
                }
                className="bg-[#151515] border border-white/10 rounded-[22px] p-5 mb-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="w-11 h-11 rounded-2xl bg-[#2B2112] items-center justify-center mr-3">
                    <Trophy color="#E0B566" size={22} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-white text-lg font-bold"
                      numberOfLines={2}
                    >
                      {event.name}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {event.governingBody}
                    </Text>
                  </View>
                  <View
                    className={`rounded-full border px-2.5 py-1 ${
                      live
                        ? 'bg-red-500/10 border-red-500/40'
                        : 'bg-white/5 border-white/15'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        live ? 'text-red-400' : 'text-gray-300'
                      }`}
                    >
                      {humanize(event.status).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View className="mt-4 pt-4 border-t border-white/10">
                  <View className="flex-row items-center mb-2">
                    <CalendarDays color="#888" size={16} />
                    <Text className="text-gray-300 text-xs ml-2">
                      {formatDate(event.startsAt)}
                    </Text>
                  </View>
                  {location ? (
                    <View className="flex-row items-center mb-2">
                      <MapPin color="#888" size={16} />
                      <Text
                        className="text-gray-300 text-xs ml-2 flex-1"
                        numberOfLines={1}
                      >
                        {location}
                      </Text>
                    </View>
                  ) : null}
                  <View className="flex-row items-center">
                    <Users color="#888" size={16} />
                    <Text className="text-gray-300 text-xs ml-2">
                      {event.divisionIds?.length ?? 0} divisions · Fantasy
                      period {event.fantasyPeriod}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {!events.length && (
            <View className="items-center py-20 px-8">
              <CalendarDays color="#555" size={38} />
              <Text className="text-white font-semibold mt-4">
                No events in this view
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-2">
                Published competition events will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
