import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Search, Trash2 } from 'lucide-react-native';

import { RootStackParamList } from '../../../App';
import {
  useGetOrganizationsQuery,
  useUpdateMeMutation,
} from '../../store/api/usersApi';
import { favoriteUpdate } from '../../store/api/favoriteOrganizations';
import { showToast } from '../../utils/toast';

/**
 * Choosing a favourite gym or a favourite team.
 *
 * One screen for both, because they pick from the same list. A gym and a team
 * are both organizations here - that collection already carries the gym-ish
 * fields and the team-ish ones, and there is no squad entity to point at - so
 * two screens would be the same screen twice, differing only in which field
 * they write.
 *
 * Which field that is comes from the route, so the caller decides and this
 * screen never guesses. It is also what the title says out loud, since the two
 * lists are otherwise identical and picking the wrong one would be invisible.
 */

type PickerRoute = RouteProp<RootStackParamList, 'OrganizationPicker'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrganizationPickerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PickerRoute>();
  const insets = useSafeAreaInsets();

  const { field, title, currentId } = route.params;

  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  /**
   * Searched server-side rather than filtered here.
   *
   * The organization list is unbounded and this is a phone: fetching it whole
   * to filter locally is the thing that works in development and falls over
   * once the data is real.
   */
  const { data: organizations, isLoading, isError, refetch } =
    useGetOrganizationsQuery({ search: search.trim() || undefined, limit: 30 });

  const [updateMe] = useUpdateMeMutation();

  const rows = useMemo(() => organizations ?? [], [organizations]);

  /**
   * Writes the one field this picker owns.
   *
   * `null` clears it, which is why the parameter is nullable rather than the
   * caller omitting it: omitting a field leaves it alone, so there would be no
   * way to un-set a favourite.
   */
  const choose = async (id: string | null) => {
    if (saving) return;

    try {
      setSaving(id ?? 'clear');
      await updateMe(favoriteUpdate(field, id)).unwrap();
      navigation.goBack();
    } catch (error: any) {
      showToast.error(
        'Could not save',
        error?.data?.message || 'Please try again.',
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <View className="flex-1 bg-[#0F0318]" style={{ paddingTop: Math.max(insets.top, 16) }}>
      <View className="flex-row items-center px-5 mb-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40 mr-4"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl text-[#B366FF] font-semibold">{title}</Text>
      </View>

      <View className="px-5 mb-4">
        <View className="flex-row items-center border border-[#6B21A8] rounded-[16px] px-4 bg-transparent">
          <Search color="#999" size={18} />
          <TextInput
            className="flex-1 text-white text-[15px] py-3 px-3"
            placeholder="Search by name or location"
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>
      </View>

      {/*
        Clearing is a real choice and needs somewhere to live. Without it the
        only way out of a favourite set by mistake is to pick a different one.
      */}
      {currentId ? (
        <TouchableOpacity
          className="flex-row items-center mx-5 mb-3 px-4 py-3 rounded-[16px] border border-[#3A144E]"
          onPress={() => choose(null)}
          disabled={!!saving}
          accessibilityRole="button"
          accessibilityLabel="Clear this favourite"
        >
          <Trash2 color="#FF8A8A" size={18} />
          <Text className="text-[#FF8A8A] text-[14px] ml-3">Clear</Text>
        </TouchableOpacity>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#B366FF" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-gray-300 text-center mb-4">
            Could not load the list.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="px-5 py-2 rounded-full border border-[#5B1F7D]"
          >
            <Text className="text-[#B366FF]">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text className="text-gray-400 text-center mt-10">
              {search.trim()
                ? 'Nothing matches that search.'
                : 'No organizations have been added yet.'}
            </Text>
          }
          renderItem={({ item }) => {
            const isCurrent = item.id === currentId;

            return (
              <TouchableOpacity
                className={`flex-row items-center px-4 py-3 mb-2 rounded-[16px] border ${
                  isCurrent ? 'border-[#B366FF] bg-[#1a0533]' : 'border-[#331166]'
                }`}
                onPress={() => choose(item.id)}
                disabled={!!saving}
                accessibilityRole="button"
                accessibilityState={{ selected: isCurrent }}
                accessibilityLabel={item.name}
              >
                {item.logoUrl ? (
                  <Image
                    source={{ uri: item.logoUrl }}
                    className="w-10 h-10 rounded-full mr-3"
                    resizeMode="contain"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full mr-3 bg-[#2A0F45] items-center justify-center">
                    <Text className="text-[#B366FF] text-[14px] font-bold">
                      {item.name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}

                <View className="flex-1">
                  <Text className="text-white text-[15px]" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.location ? (
                    <Text className="text-gray-400 text-[12px]" numberOfLines={1}>
                      {item.location}
                    </Text>
                  ) : null}
                </View>

                {saving === item.id ? (
                  <ActivityIndicator size="small" color="#B366FF" />
                ) : isCurrent ? (
                  <Check color="#B366FF" size={20} />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
