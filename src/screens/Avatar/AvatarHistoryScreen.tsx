import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, ChevronLeft, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react-native';

import { RootStackParamList } from '../../../App';
import AvatarPreview from '../../components/common/AvatarPreview';
import UsedAssets from '../../components/Avatar/UsedAssets';
import CustomLoader from '../../components/Loader/CustomLoader';
import { getBaseById } from '../../avatar/registry';
import { describeUsedAssets, normaliseConfig } from '../../avatar/resolveConfig';
import {
  SavedAvatarEntry,
  useApplyAvatarMutation,
  useDeleteAvatarMutation,
  useGetMyAvatarsQuery,
} from '../../store/api/avatarApi';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * The hero preview, sized with the editor's own formula so the wardrobe frames
 * an avatar exactly the way the editor does.
 *
 * Not an arbitrary number: part artwork is a 2400x1309 landscape canvas, so
 * `contain` fits it by width and the leftover vertical margin is what absorbs
 * `FULLBODY_STAGE_SCALE`. Too short a card and the margin is smaller than the
 * scale's growth, which crops the top of the head.
 */
const MAIN_PREVIEW_HEIGHT = Math.min(560, Dimensions.get('window').height * 0.68);
/** The strip along the bottom. Small, and deliberately not animated. */
const STRIP_PREVIEW_HEIGHT = 132;

/**
 * The user's avatar wardrobe.
 *
 * One avatar is in focus at a time: it gets the same live, layered, animated
 * preview the editor shows, plus the exact list of parts it was built from. The
 * rest sit in a strip below and can be brought into focus by tapping.
 *
 * Selecting is not applying — you can look through the wardrobe without
 * changing your avatar, and `Use this` is the explicit commit.
 */
export default function AvatarHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useGetMyAvatarsQuery({ page: 1, limit: 30 });
  const [applyAvatar] = useApplyAvatarMutation();
  const [deleteAvatar] = useDeleteAvatarMutation();

  /**
   * Normalise once per fetch rather than per render: `AvatarPreview` memoises
   * its layers on config identity, so a fresh object every render would throw
   * that away on each scroll frame.
   */
  const avatars = useMemo(
    () =>
      (data?.avatars ?? []).map((entry) => ({
        entry,
        config: normaliseConfig(entry.avatarConfig),
      })),
    [data],
  );

  /** Focus follows the applied avatar until the user picks a different one. */
  const selected = useMemo(() => {
    const chosen = avatars.find((a) => a.entry.id === selectedId);
    return chosen ?? avatars.find((a) => a.entry.isCurrent) ?? avatars[0] ?? null;
  }, [avatars, selectedId]);

  /** A deleted avatar must not leave the page focused on nothing. */
  useEffect(() => {
    if (selectedId && !avatars.some((a) => a.entry.id === selectedId)) setSelectedId(null);
  }, [avatars, selectedId]);

  const usedAssets = useMemo(
    () => describeUsedAssets(selected?.config),
    [selected?.config],
  );

  const handleApply = async (entry: SavedAvatarEntry) => {
    if (entry.isCurrent) return;
    try {
      setBusyId(entry.id);
      await applyAvatar(entry.id).unwrap();
      showToast.success('Avatar applied');
    } catch (error: any) {
      showToast.error('Could not apply that avatar', error?.data?.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (entry: SavedAvatarEntry) => {
    try {
      setBusyId(entry.id);
      await deleteAvatar(entry.id).unwrap();
      showToast.success('Removed from your history');
    } catch (error: any) {
      showToast.error('Could not remove that avatar', error?.data?.message);
    } finally {
      setBusyId(null);
    }
  };

  /** Reopens the editor seeded with this look, ready to be adjusted. */
  const handleEdit = (entry: SavedAvatarEntry) => {
    const config = normaliseConfig(entry.avatarConfig);
    const base = getBaseById(config?.base);

    if (!base) {
      showToast.warning(
        'That look cannot be reopened',
        'Its artwork is no longer part of the app. You can still apply it as your avatar.',
      );
      return;
    }

    navigation.navigate('GenerateAvatar', {
      baseImage: base.source,
      isFullbody: base.isFullbody,
      target: base.target,
      avatarCategory: base.category,
      returnTo: 'AvatarHistory',
      config,
    });
  };

  const others = avatars.filter((a) => a.entry.id !== selected?.entry.id);
  const isBusy = busyId === selected?.entry.id;

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top']}>
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl border border-[#333] justify-center items-center mr-3"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-bold">My avatars</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <CustomLoader size={40} />
        </View>
      ) : !selected ? (
        <EmptyState onCreate={() => navigation.navigate('ExploreAvatar', { returnTo: 'AvatarHistory' })} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#8B3DFF" />
          }
        >
          {/* The one avatar in focus: live layers, blinking and breathing. */}
          <View className="px-5">
            <AvatarPreview
              config={selected.config}
              height={MAIN_PREVIEW_HEIGHT}
              fallbackUri={selected.entry.avatarUrl}
              fallbackName="Avatar"
            />
          </View>

          <View className="flex-row items-center justify-center mt-4 px-5">
            {selected.entry.isCurrent ? (
              <View className="flex-row items-center px-4 py-2 rounded-full bg-[#8B3DFF]/20 border border-[#8B3DFF]/50">
                <Check color="#8B3DFF" size={14} />
                <Text className="text-[#8B3DFF] text-[12px] font-bold ml-1.5">In use</Text>
              </View>
            ) : (
              <TouchableOpacity
                className="px-6 py-2.5 rounded-full bg-[#8B3DFF]"
                onPress={() => handleApply(selected.entry)}
                disabled={isBusy}
                accessibilityLabel="Use this avatar"
                accessibilityRole="button"
              >
                <Text className="text-white text-[12px] font-bold">
                  {isBusy ? 'Applying…' : 'Use this avatar'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="ml-3 w-10 h-10 rounded-full border border-[#3A2A50] items-center justify-center"
              onPress={() => handleEdit(selected.entry)}
              disabled={isBusy}
              accessibilityLabel="Edit a copy of this avatar"
              accessibilityRole="button"
            >
              <Pencil color="#B995F5" size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              className="ml-2 w-10 h-10 rounded-full border border-[#3A2A50] items-center justify-center"
              onPress={() => handleDelete(selected.entry)}
              disabled={isBusy}
              accessibilityLabel="Delete this avatar"
              accessibilityRole="button"
            >
              <Trash2 color="#8C849C" size={16} />
            </TouchableOpacity>
          </View>

          <AvatarDetails entry={selected.entry} resolved={Boolean(selected.config)} />

          <UsedAssets items={usedAssets} />

          <View className="px-5 pt-4">
            <Text className="text-white text-[15px] font-bold mb-3">
              My other avatars{others.length ? ` (${others.length})` : ''}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {others.map(({ entry, config }) => (
                <TouchableOpacity
                  key={entry.id}
                  activeOpacity={0.85}
                  className="mr-3 w-[92px]"
                  onPress={() => setSelectedId(entry.id)}
                  accessibilityLabel={`View ${entry.isCurrent ? 'current avatar' : 'saved avatar'}`}
                  accessibilityRole="button"
                >
                  {/* Still a live layered render, just not an animated one -
                      see the note on the strip below. */}
                  <AvatarPreview
                    config={config}
                    height={STRIP_PREVIEW_HEIGHT}
                    animated={false}
                    fallbackUri={entry.avatarUrl}
                    fallbackName="Avatar"
                  />
                  {entry.isCurrent && (
                    <View className="flex-row items-center justify-center mt-1.5">
                      <Check color="#8B3DFF" size={10} />
                      <Text className="text-[#8B3DFF] text-[9px] font-bold ml-1">In use</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                activeOpacity={0.85}
                className="w-[92px] rounded-[18px] border border-dashed border-[#3A2A50] items-center justify-center"
                style={{ height: STRIP_PREVIEW_HEIGHT }}
                onPress={() => navigation.navigate('ExploreAvatar', { returnTo: 'AvatarHistory' })}
                accessibilityLabel="Create a new avatar"
                accessibilityRole="button"
              >
                <Plus color="#8B3DFF" size={22} />
                <Text className="text-[#8C849C] text-[10px] font-semibold mt-1.5 px-2 text-center">
                  Create new
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function AvatarDetails({ entry, resolved }: { entry: SavedAvatarEntry; resolved: boolean }) {
  const created = entry.createdAt
    ? new Date(entry.createdAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <View className="px-5 pt-6">
      <View className="flex-row flex-wrap">
        {created && <Detail label="Created" value={created} />}
        <Detail label="Status" value={entry.isCurrent ? 'In use' : 'Saved'} />
        {/* Says plainly when the card is the saved snapshot rather than a live render. */}
        <Detail label="Preview" value={resolved ? 'Live render' : 'Snapshot'} />
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="mr-8 mb-2">
      <Text className="text-[#8C849C] text-[9px] font-bold uppercase tracking-wider">{label}</Text>
      <Text className="text-white text-[13px] mt-0.5">{value}</Text>
    </View>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <Sparkles color="#3f3f46" size={40} />
      <Text className="text-white text-[16px] font-semibold text-center mt-4">No avatars yet</Text>
      <Text className="text-gray-500 text-[13px] text-center mt-2">
        Every avatar you create is kept here, so you can switch back to an earlier look any
        time.
      </Text>
      <TouchableOpacity
        className="mt-8 bg-[#8B3DFF] px-8 py-4 rounded-full"
        activeOpacity={0.85}
        onPress={onCreate}
        accessibilityLabel="Create a new avatar"
        accessibilityRole="button"
      >
        <Text className="text-white font-semibold text-base">Create new avatar</Text>
      </TouchableOpacity>
    </View>
  );
}
