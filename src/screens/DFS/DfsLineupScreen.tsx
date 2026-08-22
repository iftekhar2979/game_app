import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Lock, Plus, X } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  DfsSlateAthlete,
  useCreateDfsEntryMutation,
  useGetContestSlateQuery,
  useGetDfsContestQuery,
  useGetMyDfsEntryQuery,
  useUpdateMyDfsLineupMutation,
} from '../../store/api/dfsApi';
import {
  buildDfsLineupPayload,
  calculateDfsSalary,
  DfsLineupAssignments,
  expandDfsSlots,
  getContestJoinMessage,
  getDfsAthleteName,
  getDfsAthletePositionCodes,
  getDfsErrorMessage,
  getEntityId,
  getSlateAthleteId,
  hydrateDfsLineup,
  isDfsAthleteCompatible,
  isDfsEntryMissing,
  validateDfsLineup,
} from '../../utils/dfsLineup';
import { showToast } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'DfsLineup'>;

const getAthletePhoto = (slateAthlete: DfsSlateAthlete): string | undefined => {
  const seasonAthlete = slateAthlete.seasonAthleteId;
  if (typeof seasonAthlete === 'string') return undefined;
  const athlete = seasonAthlete.athleteId;
  return typeof athlete === 'object' ? athlete?.photoUrl : undefined;
};

export default function DfsLineupScreen({ navigation, route }: Props) {
  const { contestId } = route.params;
  const contestQuery = useGetDfsContestQuery(contestId);
  const slateQuery = useGetContestSlateQuery(contestId);
  const entryQuery = useGetMyDfsEntryQuery(contestId);
  const [createEntry, createState] = useCreateDfsEntryMutation();
  const [updateLineup, updateState] = useUpdateMyDfsLineupMutation();
  const [assignments, setAssignments] = useState<DfsLineupAssignments>({});
  const [activeSlotKey, setActiveSlotKey] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const hydratedEntry = useRef<string | undefined>(undefined);

  const contest = contestQuery.data;
  const slateAthletes = useMemo(
    () => slateQuery.data?.athleteSlates ?? [],
    [slateQuery.data?.athleteSlates],
  );
  const slots = useMemo(
    () => expandDfsSlots(contest?.lineupSlots ?? []),
    [contest?.lineupSlots],
  );
  const entryMissing = isDfsEntryMissing(entryQuery.error);
  const hasEntry = Boolean(entryQuery.data);

  useEffect(() => {
    if (!slots.length) return;
    if (entryQuery.data) {
      const hydrationKey = `${getEntityId(entryQuery.data)}:${
        entryQuery.data.updatedAt ?? JSON.stringify(entryQuery.data.lineup)
      }`;
      if (hydratedEntry.current !== hydrationKey) {
        setAssignments(hydrateDfsLineup(slots, entryQuery.data.lineup));
        hydratedEntry.current = hydrationKey;
      }
    } else if (entryMissing && hydratedEntry.current !== 'new-entry') {
      setAssignments({});
      hydratedEntry.current = 'new-entry';
    }
  }, [entryMissing, entryQuery.data, slots]);

  const athletesById = useMemo(
    () =>
      new Map(
        slateAthletes.map(athlete => [getSlateAthleteId(athlete), athlete]),
      ),
    [slateAthletes],
  );
  const selectedIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean) as string[]),
    [assignments],
  );
  const salaryUsed = calculateDfsSalary(assignments, slateAthletes);
  const salaryRemaining = Math.max(0, (contest?.salaryCap ?? 0) - salaryUsed);
  const filledSlots = slots.filter(slot =>
    Boolean(assignments[slot.key]),
  ).length;
  const lineupComplete = slots.length > 0 && filledSlots === slots.length;
  const activeSlot = slots.find(slot => slot.key === activeSlotKey);
  const isSaving = createState.isLoading || updateState.isLoading;

  const beforeLock = contest
    ? new Date(contest.lockTime).getTime() > Date.now()
    : false;
  const canEdit = Boolean(
    contest &&
      contest.status === 'open' &&
      contest.type === 'free' &&
      contest.entryFee === 0 &&
      beforeLock,
  );
  const unavailableMessage = contest
    ? hasEntry
      ? canEdit
        ? undefined
        : contest.status === 'open' && !beforeLock
        ? 'The contest has started. Your saved lineup is view-only.'
        : 'This lineup is view-only now.'
      : getContestJoinMessage(contest)
    : undefined;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        contestQuery.refetch(),
        slateQuery.refetch(),
        entryQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const chooseAthlete = (athleteId: string) => {
    if (!activeSlotKey) return;
    setAssignments(current => ({ ...current, [activeSlotKey]: athleteId }));
    setActiveSlotKey(undefined);
  };

  const removeAthlete = (slotKey: string) => {
    setAssignments(current => {
      const next = { ...current };
      delete next[slotKey];
      return next;
    });
  };

  const submit = async () => {
    if (!contest || !slateQuery.data) return;
    if (!canEdit) {
      showToast.warning(
        'Lineup locked',
        unavailableMessage ?? 'This lineup cannot be changed.',
      );
      return;
    }
    if (!slots.length) {
      showToast.error(
        'Lineup unavailable',
        'This contest has no lineup spots yet.',
      );
      return;
    }

    const validationMessage = validateDfsLineup(
      contest,
      slots,
      assignments,
      slateAthletes,
    );
    if (validationMessage) {
      showToast.warning('Check your lineup', validationMessage);
      return;
    }

    const lineup = buildDfsLineupPayload(slots, assignments);
    try {
      const saved = hasEntry
        ? await updateLineup({ contestId, lineup }).unwrap()
        : await createEntry({ contestId, lineup }).unwrap();
      setAssignments(hydrateDfsLineup(slots, saved.lineup));
      hydratedEntry.current = `${getEntityId(saved)}:${
        saved.updatedAt ?? JSON.stringify(saved.lineup)
      }`;
      showToast.success(
        hasEntry ? 'Lineup saved!' : 'You joined the contest!',
        'Your complete lineup is ready.',
      );
      await Promise.allSettled([entryQuery.refetch(), contestQuery.refetch()]);
    } catch (error) {
      showToast.error('Could not save lineup', getDfsErrorMessage(error));
      await Promise.allSettled([slateQuery.refetch(), contestQuery.refetch()]);
    }
  };

  const loading =
    contestQuery.isLoading || slateQuery.isLoading || entryQuery.isLoading;
  const blockingError =
    contestQuery.error ||
    slateQuery.error ||
    (entryQuery.error && !entryMissing);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#E0B566" />
        <Text className="text-gray-400 text-xs mt-3">
          Getting your lineup ready...
        </Text>
      </SafeAreaView>
    );
  }

  if (blockingError || !contest || !slateQuery.data) {
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
            Lineup unavailable
          </Text>
          <Text className="text-gray-400 text-sm text-center mt-2 mb-5">
            {getDfsErrorMessage(
              blockingError,
              'This lineup is not available right now.',
            )}
          </Text>
          <TouchableOpacity
            className="bg-[#8B3DFF] px-5 py-3 rounded-xl"
            onPress={onRefresh}
          >
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-[#333] bg-[#121212] items-center justify-center mr-4"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-[20px] font-bold">
            {hasEntry ? 'My Lineup' : 'Build My Lineup'}
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
            {contest.title}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E0B566"
            colors={['#E0B566', '#8B3DFF']}
            progressBackgroundColor="#121212"
          />
        }
      >
        <View className="flex-row bg-[#17121f] border border-[#5b387e] rounded-[20px] p-4 mb-4">
          <View className="flex-1">
            <Text className="text-gray-400 text-[10px] uppercase">
              Spots filled
            </Text>
            <Text className="text-white text-lg font-extrabold mt-1">
              {filledSlots}/{slots.length}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-400 text-[10px] uppercase">
              Salary used
            </Text>
            <Text className="text-white text-lg font-extrabold mt-1">
              {salaryUsed}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-400 text-[10px] uppercase">
              Remaining
            </Text>
            <Text
              className={`text-lg font-extrabold mt-1 ${
                salaryUsed > contest.salaryCap
                  ? 'text-rose-400'
                  : 'text-[#E0B566]'
              }`}
            >
              {salaryRemaining}
            </Text>
          </View>
        </View>

        {unavailableMessage ? (
          <View className="bg-[#211b13] border border-[#70572c] rounded-2xl p-4 mb-4">
            <Text className="text-[#E0B566] text-sm font-semibold">
              {unavailableMessage}
            </Text>
          </View>
        ) : null}

        <Text className="text-white text-lg font-bold mb-3">Lineup spots</Text>
        {slots.map(slot => {
          const athleteId = assignments[slot.key];
          const athlete = athleteId ? athletesById.get(athleteId) : undefined;
          return (
            <TouchableOpacity
              key={slot.key}
              className={`border rounded-2xl p-4 mb-3 ${
                athlete
                  ? 'bg-[#151515] border-[#4b3c5c]'
                  : 'bg-[#101010] border-dashed border-[#444]'
              }`}
              activeOpacity={canEdit ? 0.8 : 1}
              disabled={!canEdit}
              onPress={() => setActiveSlotKey(slot.key)}
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-[#28202f] items-center justify-center mr-3 overflow-hidden">
                  {athlete && getAthletePhoto(athlete) ? (
                    <Image
                      source={{ uri: getAthletePhoto(athlete) }}
                      className="w-12 h-12"
                    />
                  ) : athlete ? (
                    <Text className="text-[#E0B566] text-lg font-extrabold">
                      {getDfsAthleteName(athlete).slice(0, 1).toUpperCase()}
                    </Text>
                  ) : (
                    <Plus color="#777" size={22} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[#E0B566] text-[10px] font-bold uppercase">
                    {slot.slot}
                  </Text>
                  <Text
                    className="text-white text-base font-bold mt-1"
                    numberOfLines={1}
                  >
                    {athlete
                      ? getDfsAthleteName(athlete)
                      : 'Tap to choose a player'}
                  </Text>
                  {athlete ? (
                    <Text className="text-gray-400 text-xs mt-1">
                      Salary {athlete.salary} · Projected{' '}
                      {athlete.projectedPoints ?? 0}
                    </Text>
                  ) : slot.positionCodes.length ? (
                    <Text className="text-gray-500 text-xs mt-1">
                      {slot.positionCodes.join(' / ')}
                    </Text>
                  ) : null}
                </View>
                {athlete?.isLocked ? <Lock color="#f59e0b" size={18} /> : null}
                {athlete && canEdit ? (
                  <TouchableOpacity
                    className="ml-2 p-2"
                    onPress={event => {
                      event.stopPropagation();
                      removeAthlete(slot.key);
                    }}
                  >
                    <X color="#aaa" size={19} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}

        {slateAthletes.length === 0 ? (
          <View className="bg-[#121212] border border-[#333] rounded-2xl p-5 items-center">
            <Text className="text-white font-bold">
              No players available yet
            </Text>
            <Text className="text-gray-400 text-xs text-center mt-2">
              Please check back after the player pool is ready.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-black border-t border-[#292929] px-5 pt-4 pb-7">
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${
            canEdit && lineupComplete && !isSaving
              ? 'bg-[#8B3DFF]'
              : 'bg-[#333]'
          }`}
          disabled={!canEdit || !lineupComplete || isSaving}
          onPress={submit}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-extrabold">
              {hasEntry ? 'Save Complete Lineup' : 'Submit Complete Lineup'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={Boolean(activeSlot)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSlotKey(undefined)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-[#121212] border-t border-[#333] rounded-t-[28px] max-h-[78%] pb-7">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-4">
              <View>
                <Text className="text-white text-xl font-bold">
                  Pick a {activeSlot?.slot} player
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  Tap one player to fill this spot
                </Text>
              </View>
              <TouchableOpacity
                className="p-2"
                onPress={() => setActiveSlotKey(undefined)}
              >
                <X color="#aaa" size={23} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={slateAthletes}
              keyExtractor={getSlateAthleteId}
              contentContainerStyle={styles.playerList}
              ListEmptyComponent={
                <Text className="text-gray-400 text-center py-8">
                  No players are available.
                </Text>
              }
              renderItem={({ item }) => {
                const athleteId = getSlateAthleteId(item);
                const isCurrent = activeSlotKey
                  ? assignments[activeSlotKey] === athleteId
                  : false;
                const selectedElsewhere =
                  selectedIds.has(athleteId) && !isCurrent;
                const incompatible = activeSlot
                  ? !isDfsAthleteCompatible(activeSlot, item)
                  : false;
                const disabled =
                  item.isLocked || selectedElsewhere || incompatible;
                const positionCodes = getDfsAthletePositionCodes(item);

                return (
                  <TouchableOpacity
                    className={`flex-row items-center border rounded-2xl p-4 mb-3 ${
                      disabled
                        ? 'bg-[#171717] border-[#292929] opacity-50'
                        : isCurrent
                        ? 'bg-[#251a35] border-[#8B3DFF]'
                        : 'bg-[#181818] border-[#333]'
                    }`}
                    disabled={disabled}
                    onPress={() => chooseAthlete(athleteId)}
                  >
                    <View className="w-12 h-12 rounded-full bg-[#28202f] items-center justify-center mr-3 overflow-hidden">
                      {getAthletePhoto(item) ? (
                        <Image
                          source={{ uri: getAthletePhoto(item) }}
                          className="w-12 h-12"
                        />
                      ) : (
                        <Text className="text-[#E0B566] text-lg font-extrabold">
                          {getDfsAthleteName(item).slice(0, 1).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-white text-base font-bold"
                        numberOfLines={1}
                      >
                        {getDfsAthleteName(item)}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        Salary {item.salary} · Projected{' '}
                        {item.projectedPoints ?? 0}
                      </Text>
                      {positionCodes.length ? (
                        <Text className="text-[#E0B566] text-[10px] mt-1">
                          {positionCodes.join(' / ')}
                        </Text>
                      ) : null}
                      {item.isLocked ? (
                        <Text className="text-amber-400 text-[10px] font-bold mt-1">
                          LOCKED
                        </Text>
                      ) : selectedElsewhere ? (
                        <Text className="text-gray-500 text-[10px] mt-1">
                          Already selected
                        </Text>
                      ) : incompatible ? (
                        <Text className="text-gray-500 text-[10px] mt-1">
                          Different position
                        </Text>
                      ) : null}
                    </View>
                    {isCurrent ? <Check color="#8B3DFF" size={21} /> : null}
                    {item.isLocked ? <Lock color="#f59e0b" size={19} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  playerList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
