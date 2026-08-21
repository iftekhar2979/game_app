import React, { useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, ChevronLeft, Pencil, Sparkles, Trash2 } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import AvatarPreview from '../../components/common/AvatarPreview';
import CustomLoader from '../../components/Loader/CustomLoader';
import { getBaseById } from '../../avatar/registry';
import { normaliseConfig } from '../../avatar/resolveConfig';
import {
  SavedAvatarEntry,
  useApplyAvatarMutation,
  useDeleteAvatarMutation,
  useGetMyAvatarsQuery,
} from '../../store/api/avatarApi';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Two columns rather than three: a full-body avatar needs the height to read as
 * a figure instead of a thumbnail.
 */
const AVATAR_COLUMNS = 2;
const AVATAR_CARD_HEIGHT = 230;

/**
 * The user's avatar wardrobe: every look they have built.
 *
 * Tapping one re-applies it as the current avatar; the pencil reopens the editor
 * seeded with that look's saved configuration, so an old avatar can be used as
 * the starting point for a new one.
 */
export default function AvatarHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useGetMyAvatarsQuery({ page: 1, limit: 30 });
  const [applyAvatar] = useApplyAvatarMutation();
  const [deleteAvatar] = useDeleteAvatarMutation();

  const avatars = data?.avatars ?? [];

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
      // Normalised above: unknown ids are already nulled, so the editor opens on
      // exactly the parts this look still resolves to.
      config,
    });
  };

  const renderItem = ({ item }: { item: SavedAvatarEntry }) => {
    const isBusy = busyId === item.id;
    // Rebuilt from the stored config so the card shows the live, layered avatar
    // rather than the flat snapshot taken at save time.
    const config = normaliseConfig(item.avatarConfig);

    // maxWidth caps the last row's orphan: `flex-1` alone would let a lone card
    // stretch across the whole row and render at a different size.
    return (
      <View
        className="flex-1 m-1.5 rounded-2xl border border-[#333] bg-[#121212] p-3 items-center"
        style={{ maxWidth: `${100 / AVATAR_COLUMNS}%` }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleApply(item)}
          disabled={isBusy}
          accessibilityLabel={item.isCurrent ? 'Current avatar' : 'Apply this avatar'}
          accessibilityRole="button"
          style={{ width: '100%' }}
        >
          <AvatarPreview
            config={config}
            height={AVATAR_CARD_HEIGHT}
            fallbackUri={item.avatarUrl}
            fallbackName="Avatar"
          />
        </TouchableOpacity>

        {item.isCurrent ? (
          <View className="flex-row items-center mt-2.5 px-2.5 py-1 rounded-full bg-[#8B3DFF]/20 border border-[#8B3DFF]/50">
            <Check color="#8B3DFF" size={11} />
            <Text className="text-[#8B3DFF] text-[10px] font-bold ml-1">In use</Text>
          </View>
        ) : (
          <TouchableOpacity
            className="mt-2.5 px-3 py-1 rounded-full border border-[#444]"
            onPress={() => handleApply(item)}
            disabled={isBusy}
          >
            <Text className="text-gray-300 text-[10px] font-semibold">
              {isBusy ? 'Applying…' : 'Use this'}
            </Text>
          </TouchableOpacity>
        )}

        <View className="flex-row items-center mt-3">
          <TouchableOpacity
            className="px-2"
            onPress={() => handleEdit(item)}
            disabled={isBusy}
            accessibilityLabel="Edit a copy of this avatar"
            accessibilityRole="button"
          >
            <Pencil color="#888" size={15} />
          </TouchableOpacity>
          <TouchableOpacity
            className="px-2"
            onPress={() => handleDelete(item)}
            disabled={isBusy}
            accessibilityLabel="Delete this avatar"
            accessibilityRole="button"
          >
            <Trash2 color="#888" size={15} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-5">
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
      ) : (
        <FlatList
          data={avatars}
          keyExtractor={(entry) => entry.id}
          renderItem={renderItem}
          numColumns={AVATAR_COLUMNS}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 110, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="items-center px-10 py-20">
              <Sparkles color="#3f3f46" size={40} />
              <Text className="text-white text-[16px] font-semibold text-center mt-4">
                No avatars yet
              </Text>
              <Text className="text-gray-500 text-[13px] text-center mt-2">
                Every avatar you create is kept here, so you can switch back to an
                earlier look any time.
              </Text>
            </View>
          }
        />
      )}

      <View className="absolute bottom-8 w-full px-10">
        <TouchableOpacity
          className="w-full bg-[#8B3DFF] py-4 rounded-full items-center justify-center"
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ExploreAvatar', { returnTo: 'AvatarHistory' })}
          accessibilityLabel="Create a new avatar"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold text-base">Create new avatar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
