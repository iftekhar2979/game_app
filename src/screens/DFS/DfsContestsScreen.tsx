import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { DfsContest, useGetDfsContestsQuery } from '../../store/api/dfsApi';
import { getDfsErrorMessage, getEntityId } from '../../utils/dfsLineup';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const statusLabel = (status: DfsContest['status']) =>
  status.replace('_', ' ').toUpperCase();

export default function DfsContestsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data, error, isLoading, isFetching, refetch } =
    useGetDfsContestsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-[#333] bg-[#121212] items-center justify-center mr-4"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-[22px] font-bold">
            Daily Fantasy
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            Choose a contest to play
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E0B566" />
          <Text className="text-gray-400 text-xs mt-3">
            Loading contests...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-base font-bold mb-2">
            Could not load contests
          </Text>
          <Text className="text-gray-400 text-sm text-center mb-5">
            {getDfsErrorMessage(error)}
          </Text>
          <TouchableOpacity
            className="bg-[#8B3DFF] px-5 py-3 rounded-xl"
            onPress={refetch}
          >
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={contest => getEntityId(contest)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E0B566"
              colors={['#E0B566', '#8B3DFF']}
              progressBackgroundColor="#121212"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#333] items-center justify-center mb-4">
                <Trophy color="#777" size={28} />
              </View>
              <Text className="text-white text-base font-bold">
                No contests right now
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2">
                Check back soon for a new game.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const contestId = getEntityId(item);
            const isOpen = item.status === 'open';
            return (
              <TouchableOpacity
                className="bg-[#121212] border border-[#2d2d2d] rounded-[20px] p-5 mb-4"
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('DfsContestDetail', { contestId })
                }
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text
                      className="text-white text-lg font-bold"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-[#E0B566] text-xs font-semibold mt-1">
                      {item.type === 'free' ? 'FREE TO PLAY' : 'PAID CONTEST'}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1.5 rounded-full border ${
                      isOpen
                        ? 'bg-emerald-400/10 border-emerald-400/40'
                        : 'bg-[#2a2a2a] border-[#444]'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-extrabold ${
                        isOpen ? 'text-emerald-400' : 'text-gray-300'
                      }`}
                    >
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row mt-4">
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[10px] uppercase">
                      Players
                    </Text>
                    <Text className="text-white text-sm font-bold mt-1">
                      {item.entrantCount}/{item.maxEntrants}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[10px] uppercase">
                      Salary cap
                    </Text>
                    <Text className="text-white text-sm font-bold mt-1">
                      {item.salaryCap}
                    </Text>
                  </View>
                  <View className="justify-center">
                    <Text className="text-[#8B3DFF] text-sm font-bold">
                      View →
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            isFetching && !refreshing ? (
              <ActivityIndicator color="#E0B566" className="my-4" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
});
