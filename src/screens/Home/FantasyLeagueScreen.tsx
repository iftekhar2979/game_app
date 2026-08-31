import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Animated,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  Key,
  X,
  Check,
  ArrowUpDown,
  Sparkles,
  QrCode,
  Upload,
  CheckCircle2,
  Users,
  Camera,
} from 'lucide-react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
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

  // QR Scanner Modal State
  const [isScannerModalVisible, setIsScannerModalVisible] = useState(false);
  const [scannerStep, setScannerStep] = useState<'scan' | 'team_name'>('scan');
  const [scannedCode, setScannedCode] = useState('');
  const [scannerTeamName, setScannerTeamName] = useState('');
  const [manualCodeInput, setManualCodeInput] = useState('');
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Pagination state
  const [page, setPage] = useState(1);
  const [accumulatedLeagues, setAccumulatedLeagues] = useState<any[]>([]);

  // Scanner laser animation
  useEffect(() => {
    if (isScannerModalVisible && scannerStep === 'scan') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      scanAnim.setValue(0);
    }
  }, [isScannerModalVisible, scannerStep, scanAnim]);

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

  // Scanner helpers
  const handleCodeScanned = (code: string) => {
    let cleanCode = code.trim().toUpperCase();
    if (cleanCode.includes('CODE=')) {
      const match = cleanCode.match(/CODE=([A-Z0-9_-]+)/i);
      if (match?.[1]) cleanCode = match[1];
    } else if (cleanCode.includes('/JOIN/')) {
      const parts = cleanCode.split('/JOIN/');
      if (parts[1]) cleanCode = parts[1].split('?')[0].split('/')[0];
    } else if (cleanCode.startsWith('CHEERBATTLE:')) {
      cleanCode = cleanCode.replace('CHEERBATTLE:', '').trim();
    }

    if (!cleanCode) {
      showToast.error('Invalid Code', 'Could not detect a valid league code.');
      return;
    }
    setScannedCode(cleanCode);
    setScannerStep('team_name');
    showToast.success('QR Code Scanned', `League Code: ${cleanCode}`);
  };

  const handlePickQRImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      showToast.info('Image Selected', 'Enter or confirm the 6-digit code from the QR.');
    } catch (e) {
      showToast.error('Gallery Error', 'Could not access photo library');
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        if (result.errorCode === 'camera_unavailable') {
          showToast.error(
            'Camera Unavailable',
            'Camera is not available on this device',
          );
        } else if (result.errorCode === 'permission') {
          showToast.error(
            'Permission Required',
            'Please grant Camera permission in device Settings -> Apps -> CheerBattle',
          );
        } else {
          showToast.error(
            'Camera Error',
            result.errorMessage || 'Could not open camera',
          );
        }
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        return;
      }

      setScannedCode('');
      setScannerStep('team_name');
      setIsScannerModalVisible(true);
      showToast.info(
        'Photo Captured',
        'Enter or confirm the 6-digit league code to join.',
      );
    } catch (err: any) {
      showToast.error('Camera Error', err?.message || 'Could not open camera');
    }
  };

  const handleJoinFromScanner = async () => {
    const trimmedCode = scannedCode.trim();
    const trimmedTeam = scannerTeamName.trim();

    if (!trimmedCode) {
      showToast.error('Error', 'Please enter or scan a valid league code');
      return;
    }
    if (!trimmedTeam) {
      showToast.error('Error', 'Please enter a fantasy team name');
      return;
    }

    try {
      const res: any = await joinByCode({
        code: trimmedCode,
        fantasyTeamName: trimmedTeam,
      }).unwrap();

      if (res?.alreadyJoined) {
        showToast.info(
          'Already Joined',
          'You are already a member of this league. Opening league details...',
        );
      } else {
        showToast.success('Success', 'Successfully joined fantasy league!');
      }

      setIsScannerModalVisible(false);
      setScannedCode('');
      setScannerTeamName('');
      setManualCodeInput('');
      setScannerStep('scan');
      refetch();

      const joinedLeagueId =
        res?.league?._id || res?.league?.id || res?._id || res?.id;
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
          className="w-12 h-12 rounded-xl mr-3 bg-[#222]"
        />
        <View className="flex-1">
          <Text className="text-white text-base font-bold" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Users color="#888" size={13} />
            <Text className="text-gray-400 text-xs ml-1 font-medium">
              {item.membersCount} {item.membersCount === 1 ? 'member' : 'members'}
            </Text>
            <Text className="text-gray-600 text-xs mx-1.5">&bull;</Text>
            <Text className="text-gray-500 text-[11px] capitalize">
              {item.visibility}
            </Text>
          </View>
        </View>
      </View>

      <View
        className={`px-3 py-1.5 rounded-full border ${
          item.status === 'Draft'
            ? 'bg-[#8B3DFF]/15 border-[#8B3DFF]/50'
            : 'bg-[#00FF66]/15 border-[#00FF66]/50'
        }`}
      >
        <Text
          className={`text-xs font-bold ${
            item.status === 'Draft' ? 'text-[#8B3DFF]' : 'text-[#00FF66]'
          }`}
        >
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 border border-[#2a2a2a] rounded-xl items-center justify-center bg-[#121212] mr-3"
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[22px] font-bold">Cheer Battle Leagues</Text>
        </View>
      </View>

      {/* Search & Action Bar */}
      <View className="px-5 mb-3 flex-row items-center">
        {/* Search Input Box */}
        <View className="flex-1 flex-row items-center bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2.5 mr-2">
          <Search color="#888" size={16} />
          <TextInput
            className="flex-1 text-white text-[13px] ml-2 p-0"
            placeholder="Search leagues..."
            placeholderTextColor="#666"
            value={searchInput}
            onChangeText={setSearchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')} className="p-1">
              <X color="#999" size={14} />
            </TouchableOpacity>
          )}
        </View>

        {/* Join by Code Button */}
        <TouchableOpacity
          className="flex-row items-center bg-[#1a1428] border border-[#8B3DFF]/60 rounded-xl px-2.5 py-2.5 mr-1.5"
          activeOpacity={0.8}
          onPress={() => setIsJoinCodeModalVisible(true)}
        >
          <Key color="#8B3DFF" size={15} />
          <Text className="text-[#8B3DFF] text-[11px] font-bold ml-1">Code</Text>
        </TouchableOpacity>

        {/* Scanner Button */}
        <TouchableOpacity
          className="flex-row items-center bg-[#0d2229] border border-[#00FFFF]/60 rounded-xl px-2.5 py-2.5"
          activeOpacity={0.8}
          onPress={handleLaunchCamera}
        >
          <QrCode color="#00FFFF" size={15} />
          <Text className="text-[#00FFFF] text-[11px] font-bold ml-1">Scan</Text>
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
          <View className="flex-row items-center">
            <TouchableOpacity
              className="flex-row items-center bg-[#8B3DFF] px-4 py-2.5 rounded-xl mr-2"
              onPress={() => setIsJoinCodeModalVisible(true)}
            >
              <Key color="#fff" size={16} />
              <Text className="text-white text-xs font-bold ml-2">Join with Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-[#0d2229] border border-[#00FFFF]/60 px-4 py-2.5 rounded-xl"
              onPress={() => {
                setScannedCode('');
                setScannerTeamName('');
                setManualCodeInput('');
                setScannerStep('scan');
                setIsScannerModalVisible(true);
              }}
            >
              <QrCode color="#00FFFF" size={16} />
              <Text className="text-[#00FFFF] text-xs font-bold ml-2">Scan QR</Text>
            </TouchableOpacity>
          </View>
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
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#E0B566" />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        />
      )}

      {/* Sort Options Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/70 justify-end"
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

      {/* QR Scanner & Automatic Join Modal */}
      <Modal
        visible={isScannerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsScannerModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/90 justify-center items-center px-5"
        >
          <View className="w-full bg-[#111] border border-[#2a2a2a] rounded-3xl p-6 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                {scannerStep === 'team_name' ? (
                  <TouchableOpacity
                    onPress={() => setScannerStep('scan')}
                    className="w-8 h-8 rounded-full bg-[#1a1a1a] justify-center items-center mr-2.5 border border-[#333]"
                  >
                    <ChevronLeft color="#00FFFF" size={18} />
                  </TouchableOpacity>
                ) : (
                  <View className="w-9 h-9 rounded-full bg-[#00FFFF]/15 justify-center items-center mr-3 border border-[#00FFFF]/40">
                    <QrCode color="#00FFFF" size={18} />
                  </View>
                )}
                <Text className="text-white text-lg font-bold">
                  {scannerStep === 'scan' ? 'Scan League QR Code' : 'Name Your Fantasy Team'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsScannerModalVisible(false)}
                className="p-1"
              >
                <X color="#999" size={20} />
              </TouchableOpacity>
            </View>

            {scannerStep === 'scan' ? (
              /* Step 1: Scanner Viewfinder */
              <View className="items-center">
                <Text className="text-gray-400 text-xs text-center mb-5 px-2">
                  Align the commissioner's QR code within the frame to automatically detect the league.
                </Text>

                {/* Animated Viewfinder Box (Tap to Open Camera) */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleLaunchCamera}
                  className="w-[230px] h-[230px] rounded-3xl bg-[#0a0a0a] border border-[#00FFFF]/40 relative justify-center items-center overflow-hidden mb-4"
                >
                  {/* Glowing Corner Brackets */}
                  <View className="absolute top-2 left-2 w-7 h-7 border-t-2 border-l-2 border-[#00FFFF] rounded-tl-lg" />
                  <View className="absolute top-2 right-2 w-7 h-7 border-t-2 border-r-2 border-[#00FFFF] rounded-tr-lg" />
                  <View className="absolute bottom-2 left-2 w-7 h-7 border-b-2 border-l-2 border-[#00FFFF] rounded-bl-lg" />
                  <View className="absolute bottom-2 right-2 w-7 h-7 border-b-2 border-r-2 border-[#00FFFF] rounded-br-lg" />

                  {/* Animated Laser Scanning Beam */}
                  <Animated.View
                    style={{
                      transform: [{ translateY: laserTranslateY }],
                    }}
                    className="absolute top-2 left-3 right-3 h-[2px] bg-[#00FFFF] shadow-lg shadow-[#00FFFF]"
                  />

                  {/* QR Icon in center */}
                  <QrCode color="#00FFFF" size={72} opacity={0.35} />
                  <Text className="text-[#00FFFF] text-[11px] font-semibold mt-2">
                    Tap to Open Camera
                  </Text>
                </TouchableOpacity>

                {/* Camera and Gallery Actions Row */}
                <View className="flex-row w-full mb-4">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-[#00FFFF] py-3 rounded-xl mr-2"
                    onPress={handleLaunchCamera}
                    activeOpacity={0.85}
                  >
                    <Camera color="#000" size={17} />
                    <Text className="text-black text-xs font-bold ml-2">
                      Open Camera
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-[#181818] border border-[#333] py-3 rounded-xl ml-2"
                    onPress={handlePickQRImage}
                    activeOpacity={0.8}
                  >
                    <Upload color="#00FFFF" size={16} />
                    <Text className="text-gray-300 text-xs font-semibold ml-2">
                      Upload QR
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Manual Code Fallback Input */}
                <View className="w-full bg-[#181818] border border-[#2e2e2e] rounded-xl p-3 flex-row items-center">
                  <TextInput
                    className="flex-1 text-white text-sm p-0 font-mono uppercase tracking-[2px]"
                    placeholder="Or enter 6-digit code..."
                    placeholderTextColor="#555"
                    value={manualCodeInput}
                    onChangeText={setManualCodeInput}
                    maxLength={10}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    className={`px-3 py-1.5 rounded-lg ${
                      manualCodeInput.trim().length > 0 ? 'bg-[#00FFFF]' : 'bg-[#333]'
                    }`}
                    onPress={() => {
                      if (manualCodeInput.trim()) {
                        handleCodeScanned(manualCodeInput.trim());
                      }
                    }}
                    disabled={!manualCodeInput.trim()}
                  >
                    <Text className={`text-xs font-bold ${
                      manualCodeInput.trim().length > 0 ? 'text-black' : 'text-gray-500'
                    }`}>
                      Confirm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Step 2: Fantasy Team Name Entry */
              <View>
                {/* Verified League Code Badge */}
                <View className="bg-[#00FFFF]/10 border border-[#00FFFF]/30 rounded-2xl p-3.5 mb-5 flex-row items-center">
                  <CheckCircle2 color="#00FFFF" size={22} className="mr-3" />
                  <View className="flex-1">
                    <Text className="text-[#00FFFF] text-[11px] font-bold uppercase tracking-wider">
                      League Code Verified
                    </Text>
                    <Text className="text-white text-base font-mono font-bold tracking-[3px] mt-0.5">
                      {scannedCode}
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-300 text-xs font-semibold mb-1.5">
                  Fantasy Team Name
                </Text>
                <View className="bg-[#181818] border border-[#333] rounded-xl px-4 py-3 mb-6">
                  <TextInput
                    className="text-white text-base p-0 font-semibold"
                    placeholder="e.g. Diamond All-Stars"
                    placeholderTextColor="#555"
                    value={scannerTeamName}
                    onChangeText={setScannerTeamName}
                    autoFocus
                    autoCapitalize="words"
                  />
                </View>

                {/* Actions */}
                <View className="flex-row">
                  <TouchableOpacity
                    className="flex-1 bg-[#222] border border-[#333] py-3.5 rounded-xl items-center mr-2"
                    onPress={() => setScannerStep('scan')}
                    disabled={isJoining}
                  >
                    <Text className="text-gray-300 text-sm font-semibold">Rescan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center ml-2 ${
                      isJoining ? 'bg-[#00FFFF]/60' : 'bg-[#00FFFF]'
                    }`}
                    onPress={handleJoinFromScanner}
                    disabled={isJoining}
                    activeOpacity={0.85}
                  >
                    {isJoining ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Sparkles color="#000" size={16} />
                        <Text className="text-black text-sm font-bold ml-1.5">Join League</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
