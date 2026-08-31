import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Search,
  Key,
  X,
  Check,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useGetLeaguesQuery, useJoinByCodeMutation } from '../../store/api/leagueApi';
import { showToast } from '../../utils/toast';
import { getSocket } from '../../services/socketService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type StatusFilterType = 'all' | 'registration_open' | 'active';

interface SortOption {
  label: string;
  sortBy: 'createdAt' | 'name' | 'status' | 'joinedTeamCount';
  sortOrder: 'asc' | 'desc';
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Draft / Registration', sortBy: 'status', sortOrder: 'asc' },
  { label: 'Name (A - Z)', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Most Members', sortBy: 'joinedTeamCount', sortOrder: 'desc' },
];

export default function FantasyLeagueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const createdLeagues = useSelector((state: RootState) => state.league.leagues);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filter and Sort state
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [selectedSort, setSelectedSort] = useState<SortOption>(SORT_OPTIONS[0]);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  // Join League with Code state
  const [isJoinCodeModalVisible, setIsJoinCodeModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [fantasyTeamName, setFantasyTeamName] = useState('');
  const [joinByCode, { isLoading: isJoining }] = useJoinByCodeMutation();

  // Pagination state
  const [page, setPage] = useState(1);
  const [accumulatedLeagues, setAccumulatedLeagues] = useState<any[]>([]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset pagination on filter or sort change
  const handleStatusFilterChange = (filter: StatusFilterType) => {
    setStatusFilter(filter);
    setPage(1);
  };

  const handleSelectSort = (sort: SortOption) => {
    setSelectedSort(sort);
    setIsSortModalVisible(false);
    setPage(1);
  };

  // Construct query arguments for the server API
  const queryArgs = useMemo(() => {
    return {
      term: debouncedSearch.trim() || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sortBy: selectedSort.sortBy,
      sortOrder: selectedSort.sortOrder,
      page,
      limit: 10,
    };
  }, [debouncedSearch, statusFilter, selectedSort, page]);

  const {
    data: apiResponse,
    isLoading: isLoadingInitial,
    isFetching,
    refetch,
  } = useGetLeaguesQuery(queryArgs);

  const paginationMeta = apiResponse?.pagination;
  const hasMore = paginationMeta ? page < paginationMeta.totalPages : false;

  // Format leagues from API
  const formatLeagueItem = useCallback((league: any) => ({
    id: league._id || league.id,
    name: league.name || 'Fantasy League',
    membersCount: league.joinedTeamCount ?? league.membersCount ?? 1,
    status:
      league.status === 'registration_open' ||
      league.status === 'drafting' ||
      league.status === 'DRAFT' ||
      league.status === 'Draft'
        ? 'Draft'
        : league.status === 'active' || league.status === 'auction_active'
        ? 'Play'
        : 'Draft',
    logoUri: league.logoUri || league.logoUrl,
    visibility: league.visibility || 'public',
    createdAt: league.createdAt ? new Date(league.createdAt).getTime() : 0,
  }), []);

  // Update accumulated leagues when apiResponse updates
  useEffect(() => {
    if (!apiResponse?.data) return;

    const formatted = apiResponse.data.map(formatLeagueItem);

    if (page === 1) {
      // If server returned 0 results and no search/filters active, fallback to local created leagues if any
      if (formatted.length === 0 && !debouncedSearch && statusFilter === 'all' && createdLeagues.length > 0) {
        setAccumulatedLeagues(
          createdLeagues.map((l: any) => ({
            ...l,
            status: 'Draft',
            membersCount: l.membersCount || 1,
          }))
        );
      } else {
        setAccumulatedLeagues(formatted);
      }
    } else {
      setAccumulatedLeagues((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = formatted.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [apiResponse, page, formatLeagueItem, debouncedSearch, statusFilter, createdLeagues]);

  // Real-time listener for league updates when teams join
  useEffect(() => {
    try {
      const socket = getSocket();
      const handleGlobalTeamJoined = () => {
        refetch();
      };
      socket.on('teamJoined', handleGlobalTeamJoined);
      return () => {
        socket.off('teamJoined', handleGlobalTeamJoined);
      };
    } catch (e) {
      // ignore
    }
  }, [refetch]);

  // Handle pull to refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    try {
      await refetch();
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Handle infinite scroll trigger
  const handleEndReached = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  // Handle Join by Code submission
  const handleJoinWithCode = async () => {
    const trimmedCode = inviteCode.trim();
    const trimmedTeam = fantasyTeamName.trim();

    if (!trimmedCode) {
      showToast.error('Error', 'Please enter a valid invite code');
      return;
    }
    if (!trimmedTeam) {
      showToast.error('Error', 'Please enter a team name');
      return;
    }

    try {
      const res: any = await joinByCode({
        code: trimmedCode,
        fantasyTeamName: trimmedTeam,
      }).unwrap();

      if (res?.alreadyJoined) {
        showToast.info('Already Joined', 'You are already a member of this league. Opening league details...');
      } else {
        showToast.success('Success', 'Successfully joined fantasy league!');
      }

      setIsJoinCodeModalVisible(false);
      setInviteCode('');
      setFantasyTeamName('');
      refetch();

      const joinedLeagueId = res?.league?._id || res?.league?.id || res?._id || res?.id;
      if (joinedLeagueId) {
        navigation.navigate('LeagueDetail', { leagueId: joinedLeagueId });
      }
    } catch (err: any) {
      const errorMsg =
        typeof err?.data?.message === 'string'
          ? err.data.message
          : Array.isArray(err?.data?.message)
          ? err.data.message.join(', ')
          : 'Could not join league with this code.';
      showToast.error('Join Failed', errorMsg);
    }
  };

  // Render league item
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 mb-3"
      activeOpacity={0.8}
      onPress={() => navigation.navigate('LeagueDetail', { leagueId: item.id })}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <Image
          source={{
            uri:
              item.logoUri ||
              'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=150&auto=format&fit=crop',
          }}
          className="w-11 h-11 rounded-full bg-[#1e1e1e] mr-3.5"
        />
        <View className="justify-center flex-1">
          <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-[#E0B566] text-xs font-medium">
            {`${item.membersCount} fantasy rosters`}
          </Text>
          <Text className="text-gray-500 text-[10px] mt-0.5">
            Head-to-head cheer team draft
          </Text>
        </View>
      </View>

      {item.status === 'Draft' ? (
        <View className="px-3 py-1.5 rounded-full bg-[#E0B566]/10 border border-[#E0B566]/30">
          <Text className="text-[#E0B566] text-xs font-bold uppercase">{item.status}</Text>
        </View>
      ) : (
        <View className="px-3 py-1.5 rounded-full bg-[#8B3DFF]/15 border border-[#8B3DFF]/50">
          <Text className="text-[#8B3DFF] text-xs font-bold uppercase">{item.status}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2.5 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-11 h-11 rounded-xl border border-[#333] bg-[#121212] justify-center items-center mr-4"
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[22px] font-bold">Cheer Battle Leagues</Text>
        </View>
      </View>

      {/* Search & Action Bar */}
      <View className="px-5 mb-3 flex-row items-center">
        {/* Search Input Box */}
        <View className="flex-1 flex-row items-center bg-[#121212] border border-[#2e2e2e] rounded-xl px-3.5 py-2.5 mr-2.5">
          <Search color="#888" size={18} />
          <TextInput
            className="flex-1 text-white text-[14px] ml-2 p-0"
            placeholder="Search leagues..."
            placeholderTextColor="#666"
            value={searchInput}
            onChangeText={setSearchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')} className="p-1">
              <X color="#999" size={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Join by Code Button */}
        <TouchableOpacity
          className="flex-row items-center bg-[#1a1428] border border-[#8B3DFF]/60 rounded-xl px-3 py-2.5"
          activeOpacity={0.8}
          onPress={() => setIsJoinCodeModalVisible(true)}
        >
          <Key color="#8B3DFF" size={16} />
          <Text className="text-[#8B3DFF] text-[12px] font-bold ml-1.5">Join Code</Text>
        </TouchableOpacity>
      </View>

      {/* Filter & Sort Chips Bar */}
      <View className="px-5 pb-3 flex-row items-center justify-between">
        {/* Filter Chips */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => handleStatusFilterChange('all')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'all'
                ? 'bg-[#E0B566] border-[#E0B566]'
                : 'bg-[#121212] border-[#333]'
            } mr-2`}
          >
            <Text
              className={`text-xs font-semibold ${
                statusFilter === 'all' ? 'text-black' : 'text-gray-300'
              }`}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleStatusFilterChange('registration_open')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'registration_open'
                ? 'bg-[#E0B566] border-[#E0B566]'
                : 'bg-[#121212] border-[#333]'
            } mr-2`}
          >
            <Text
              className={`text-xs font-semibold ${
                statusFilter === 'registration_open' ? 'text-black' : 'text-gray-300'
              }`}
            >
              Draft
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleStatusFilterChange('active')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'active'
                ? 'bg-[#E0B566] border-[#E0B566]'
                : 'bg-[#121212] border-[#333]'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                statusFilter === 'active' ? 'text-black' : 'text-gray-300'
              }`}
            >
              In Play
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort Trigger Button */}
        <TouchableOpacity
          onPress={() => setIsSortModalVisible(true)}
          className="flex-row items-center bg-[#121212] border border-[#333] rounded-full px-3 py-1.5"
          activeOpacity={0.8}
        >
          <ArrowUpDown color="#E0B566" size={13} />
          <Text className="text-[#E0B566] text-xs font-medium ml-1.5" numberOfLines={1}>
            {selectedSort.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoadingInitial && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E0B566" />
          <Text className="text-gray-400 text-xs mt-3">Loading Fantasy Leagues...</Text>
        </View>
      ) : accumulatedLeagues.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#333] justify-center items-center mb-4">
            <Search color="#666" size={28} />
          </View>
          <Text className="text-white text-base font-bold text-center mb-1">
            No Leagues Found
          </Text>
          <Text className="text-gray-400 text-xs text-center mb-5">
            {debouncedSearch
              ? `No public fantasy leagues match "${debouncedSearch}".`
              : 'No leagues found matching your selected filters.'}
          </Text>
          <TouchableOpacity
            className="flex-row items-center bg-[#8B3DFF] px-4 py-2.5 rounded-xl"
            onPress={() => setIsJoinCodeModalVisible(true)}
          >
            <Key color="#fff" size={16} />
            <Text className="text-white text-xs font-bold ml-2">Have a Private Invite Code?</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={accumulatedLeagues}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B3DFF"
              colors={['#8B3DFF', '#E0B566']}
              progressBackgroundColor="#121212"
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" color="#E0B566" />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Create League Action Button */}
      <TouchableOpacity
        className="absolute bottom-[30px] right-5 w-14 h-14 rounded-2xl border border-[#444] bg-[#8B3DFF] justify-center items-center shadow-lg shadow-purple-900"
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CreateLeague')}
      >
        <Plus color="#fff" size={26} />
      </TouchableOpacity>

      {/* Sort Selection Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/80 justify-end"
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}
        >
          <View className="bg-[#121212] border-t border-[#2a2a2a] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">Sort Leagues</Text>
              <TouchableOpacity onPress={() => setIsSortModalVisible(false)} className="p-1">
                <X color="#999" size={20} />
              </TouchableOpacity>
            </View>

            {SORT_OPTIONS.map((option, index) => {
              const isSelected =
                selectedSort.sortBy === option.sortBy &&
                selectedSort.sortOrder === option.sortOrder;
              return (
                <TouchableOpacity
                  key={index}
                  className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                    isSelected ? 'bg-[#8B3DFF]/15 border border-[#8B3DFF]/40' : 'bg-[#181818]'
                  }`}
                  onPress={() => handleSelectSort(option)}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-[#8B3DFF]' : 'text-gray-200'
                    }`}
                  >
                    {option.label}
                  </Text>
                  {isSelected && <Check color="#8B3DFF" size={18} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Join League with Code Modal */}
      <Modal
        visible={isJoinCodeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsJoinCodeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/80 justify-center items-center px-5"
        >
          <View className="w-full bg-[#121212] border border-[#2e2e2e] rounded-3xl p-6">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-[#8B3DFF]/20 justify-center items-center mr-3 border border-[#8B3DFF]/40">
                  <Key color="#8B3DFF" size={18} />
                </View>
                <Text className="text-white text-lg font-bold">Join with Code</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsJoinCodeModalVisible(false)}
                className="p-1"
              >
                <X color="#999" size={20} />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-400 text-xs mb-5">
              Enter the 6-digit private invitation code and choose your fantasy team name to join.
            </Text>

            {/* Invite Code Input */}
            <Text className="text-gray-300 text-xs font-semibold mb-1.5">6-Digit Join Code</Text>
            <View className="bg-[#181818] border border-[#333] rounded-xl px-4 py-3 mb-4">
              <TextInput
                className="text-white text-base p-0 font-mono tracking-[4px] uppercase"
                placeholder="e.g. 849201"
                placeholderTextColor="#555"
                value={inviteCode}
                onChangeText={setInviteCode}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Team Name Input */}
            <Text className="text-gray-300 text-xs font-semibold mb-1.5">Fantasy Team Name</Text>
            <View className="bg-[#181818] border border-[#333] rounded-xl px-4 py-3 mb-6">
              <TextInput
                className="text-white text-sm p-0"
                placeholder="e.g. Apex Predators"
                placeholderTextColor="#555"
                value={fantasyTeamName}
                onChangeText={setFantasyTeamName}
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 bg-[#222] border border-[#333] py-3.5 rounded-xl items-center mr-2"
                onPress={() => setIsJoinCodeModalVisible(false)}
                disabled={isJoining}
              >
                <Text className="text-gray-300 text-sm font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center ml-2 ${
                  isJoining ? 'bg-[#8B3DFF]/60' : 'bg-[#8B3DFF]'
                }`}
                onPress={handleJoinWithCode}
                disabled={isJoining}
                activeOpacity={0.85}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Sparkles color="#fff" size={16} />
                    <Text className="text-white text-sm font-bold ml-1.5">Join League</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

