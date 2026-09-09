import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { US_STATES, matchesState } from '../../constants/usStates';
import { useUpdateMeMutation } from '../../store/api/usersApi';
import { showToast } from '../../utils/toast';

/**
 * Choosing a US state.
 *
 * A fixed list, so unlike the organization picker there is nothing to fetch and
 * nothing to page - the search box filters in memory because the whole list is
 * already here and always will be.
 *
 * What gets stored is the two-letter code. The name is only ever a label, which
 * is why the row shows both: someone scanning for "TX" and someone scanning for
 * "Texas" are both looking at the same line.
 */

type PickerRoute = RouteProp<RootStackParamList, 'StatePicker'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StatePickerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PickerRoute>();
  const insets = useSafeAreaInsets();

  const currentCode = route.params?.currentCode ?? null;

  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [updateMe] = useUpdateMeMutation();

  const rows = useMemo(
    () => US_STATES.filter((state) => matchesState(state, search)),
    [search],
  );

  /** `null` clears it, for the same reason the organization picker allows it. */
  const choose = async (code: string | null) => {
    if (saving) return;

    try {
      setSaving(code ?? 'clear');
      await updateMe({ state: code }).unwrap();
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
    <View
      className="flex-1 bg-[#0F0318]"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <View className="flex-row items-center px-5 mb-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40 mr-4"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl text-[#B366FF] font-semibold">Your state</Text>
      </View>

      <View className="px-5 mb-4">
        <View className="flex-row items-center border border-[#6B21A8] rounded-[16px] px-4 bg-transparent">
          <Search color="#999" size={18} />
          <TextInput
            className="flex-1 text-white text-[15px] py-3 px-3"
            placeholder="Search states"
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {currentCode ? (
        <TouchableOpacity
          className="flex-row items-center mx-5 mb-3 px-4 py-3 rounded-[16px] border border-[#3A144E]"
          onPress={() => choose(null)}
          disabled={!!saving}
          accessibilityRole="button"
          accessibilityLabel="Clear your state"
        >
          <Trash2 color="#FF8A8A" size={18} />
          <Text className="text-[#FF8A8A] text-[14px] ml-3">Clear</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text className="text-gray-400 text-center mt-10">
            No state matches that search.
          </Text>
        }
        renderItem={({ item }) => {
          const isCurrent = item.code === currentCode;

          return (
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 mb-2 rounded-[16px] border ${
                isCurrent ? 'border-[#B366FF] bg-[#1a0533]' : 'border-[#331166]'
              }`}
              onPress={() => choose(item.code)}
              disabled={!!saving}
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              accessibilityLabel={item.name}
            >
              <View className="w-10 h-10 rounded-full mr-3 bg-[#2A0F45] items-center justify-center">
                <Text className="text-[#B366FF] text-[12px] font-bold">
                  {item.code}
                </Text>
              </View>

              <Text className="flex-1 text-white text-[15px]" numberOfLines={1}>
                {item.name}
              </Text>

              {saving === item.code ? (
                <ActivityIndicator size="small" color="#B366FF" />
              ) : isCurrent ? (
                <Check color="#B366FF" size={20} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
