import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Users, ChevronDown, Calendar, Clock, Lock, Unlock, Shield, Camera } from 'lucide-react-native';
import DatePicker from 'react-native-date-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useGetActiveSeasonsQuery } from '../../store/api/seasonApi';
import { useCreateLeagueMutation } from '../../store/api/leagueApi';
import { useLazyGetPreSignedUrlQuery } from '../../store/api/usersApi';
import { showToast } from '../../utils/toast';
import { DRAFT_TYPE_OPTIONS, buildDraftSettings } from '../../constants/draftTypes';
import type { DraftTypeValue } from '../../constants/draftTypes';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreateLeagueScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const { data: activeSeasons, isLoading: isLoadingSeasons } = useGetActiveSeasonsQuery();
  const [createLeague, { isLoading: isCreating }] = useCreateLeagueMutation();
  const [getPreSignedUrl] = useLazyGetPreSignedUrlQuery();

  const [logoImageUri, setLogoImageUri] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handlePickLogo = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.uri) {
        setLogoImageUri(asset.uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const uploadLogoToS3 = async (localUri: string): Promise<string | null> => {
    try {
      setIsUploadingLogo(true);
      const fileName = `league_logo_${Date.now()}.jpg`;

      const res = await getPreSignedUrl({
        fileName,
        primaryPath: 'UserUploads',
        expiresIn: '300',
      }).unwrap();

      const { url, key } = res.data;

      const response = await fetch(localUri);
      const blob = await response.blob();

      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': blob.type || 'image/jpeg',
        },
        body: blob,
      });

      setIsUploadingLogo(false);

      if (uploadRes.ok || uploadRes.status === 200) {
        return key;
      } else {
        return key;
      }
    } catch (err) {
      console.error('Error uploading logo to S3:', err);
      setIsUploadingLogo(false);
      return null;
    }
  };

  // Log activeSeasons whenever the API responds
  useEffect(() => {
    console.log('Active Seasons loaded from API:', activeSeasons);
  }, [activeSeasons]);


  // Basic Info
  const [leagueName, setLeagueName] = useState('');
  const [description, setDescription] = useState('');
  const [fantasyTeamName, setFantasyTeamName] = useState('');
  const [maxTeams, setMaxTeams] = useState('10');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  // Draft Settings
  const [draftType, setDraftType] = useState<DraftTypeValue>('auction');
  const [startingBudget, setStartingBudget] = useState('200');
  const [minimumBid, setMinimumBid] = useState('1');
  const [bidIncrement, setBidIncrement] = useState('1');
  const [nominationSeconds, setNominationSeconds] = useState('30');
  const [biddingSeconds, setBiddingSeconds] = useState('15');
  const [draftDurationMinutes, setDraftDurationMinutes] = useState('5');

  // Timing
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [draftTime, setDraftTime] = useState<Date | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [openTimePicker, setOpenTimePicker] = useState(false);
  
  // Modals
  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [isDraftTypeModalVisible, setIsDraftTypeModalVisible] = useState(false);

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month} - ${day} - ${year}`;
  };

  const formatTimeStr = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const memberOptions = ['4', '6', '8', '10', '12', '14', '16', '18', '20'];
  const draftTypeOptions = DRAFT_TYPE_OPTIONS;

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  // Memoised so the auto-select effect below does not re-run on every render.
  const seasonsList: any[] = useMemo(() => (
    Array.isArray(activeSeasons)
      ? activeSeasons
      : (activeSeasons as any)?.data && Array.isArray((activeSeasons as any).data)
        ? (activeSeasons as any).data
        : []
  ), [activeSeasons]);

  useEffect(() => {
    if (!selectedSeasonId && seasonsList.length > 0) {
      setSelectedSeasonId(seasonsList[0]._id || seasonsList[0].id);
    }
  }, [seasonsList, selectedSeasonId]);

  const activeSeasonObj = seasonsList.find((s) => (s._id || s.id) === selectedSeasonId) || seasonsList[0];
  const hasSeason = seasonsList.length > 0;
  const canPickSeason = seasonsList.length > 1;
  const [isSeasonModalVisible, setIsSeasonModalVisible] = useState(false);

  const formatDeadline = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  };
  const registrationDeadline = formatDeadline(activeSeasonObj?.registrationEndsAt);

  const handleCreateLeague = async () => {
    if (!leagueName.trim() || !fantasyTeamName.trim()) {
      showToast.error('Required', 'Please enter a league name and fantasy team name');
      return;
    }

    if (!seasonsList || seasonsList.length === 0) {
      showToast.error('Error', 'No active season found to create a league.');
      return;
    }

    const durationMins = parseInt(draftDurationMinutes, 10);
    if (isNaN(durationMins) || durationMins < 5) {
      showToast.error('Validation Error', 'Draft duration must be at least 5 minutes.');
      return;
    }

    const pickDurationSeconds = durationMins * 60;

    const seasonId = selectedSeasonId || (seasonsList[0]._id || seasonsList[0].id);
    let draftStartsAt: string | undefined;

    if (draftDate && draftTime) {
      const combined = new Date(draftDate);
      combined.setHours(draftTime.getHours(), draftTime.getMinutes(), 0, 0);

      if (combined.getTime() <= Date.now()) {
        showToast.error('Validation Error', 'Draft start time must be in the future.');
        return;
      }

      draftStartsAt = combined.toISOString();
    } else {
      // Default to 15 minutes from now if not explicitly scheduled
      const defaultStart = new Date(Date.now() + 15 * 60 * 1000);
      draftStartsAt = defaultStart.toISOString();
    }

    try {
      let uploadedLogoKey: string | undefined;
      if (logoImageUri) {
        const key = await uploadLogoToS3(logoImageUri);
        if (key) {
          uploadedLogoKey = key;
        }
      }

      await createLeague({
        seasonId,
        name: leagueName,
        description,
        logoUrl: uploadedLogoKey,
        visibility,
        maxTeams: parseInt(maxTeams, 10),
        fantasyTeamName,
        draftSettings: buildDraftSettings({
          type: draftType,
          startingBudget: parseInt(startingBudget, 10),
          minimumBid: parseInt(minimumBid, 10),
          bidIncrement: parseInt(bidIncrement, 10),
          nominationDurationSeconds: parseInt(nominationSeconds, 10),
          biddingDurationSeconds: parseInt(biddingSeconds, 10),
          pickDurationSeconds,
          draftStartsAt,
        }),
      }).unwrap();

      showToast.success('Success', 'League created successfully!');
      navigation.goBack();
    } catch (error: any) {
      console.log(error);
      showToast.error('Error', error?.data?.message || 'Failed to create league');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2.5 pb-6">
          <TouchableOpacity
            className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[22px] font-semibold">Create League</Text>
        </View>

        {isLoadingSeasons ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#B366FF" />
            <Text className="text-[#999] mt-4">Loading active seasons...</Text>
          </View>
        ) : !hasSeason ? (
          // Nothing to create a league against, so say so instead of letting the
          // whole form be filled in and rejected on submit.
          <View className="flex-1 justify-center items-center px-8">
            <View className="w-16 h-16 rounded-full border border-[#333] bg-[#120824] justify-center items-center mb-4">
              <Calendar color="#B366FF" size={26} />
            </View>
            <Text className="text-white text-base font-bold mb-2 text-center">
              No season is open for registration
            </Text>
            <Text className="text-[#999] text-xs text-center mb-6">
              Leagues can only be created while a season is accepting registrations. Check
              back once the next season opens.
            </Text>
            <TouchableOpacity
              className="border border-[#B366FF] px-5 py-2.5 rounded-full"
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text className="text-[#B366FF] text-sm font-medium">Go back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            
            {/* Target season — every field comes from the season record itself. */}
            {activeSeasonObj && (
              <TouchableOpacity
                className="border border-[#B366FF]/40 rounded-2xl bg-[#120824] p-4 mb-6 flex-row items-center justify-between"
                activeOpacity={canPickSeason ? 0.7 : 1}
                disabled={!canPickSeason}
                onPress={() => setIsSeasonModalVisible(true)}
              >
                <View className="flex-1">
                  <Text className="text-[#B366FF] text-xs uppercase font-bold tracking-wider mb-1">Target Season</Text>
                  <Text className="text-white text-base font-bold">{activeSeasonObj.name}</Text>
                  <Text className="text-[#999] text-xs mt-0.5">
                    {registrationDeadline
                      ? `Registration closes ${registrationDeadline}`
                      : 'Open for registration'}
                  </Text>
                  {canPickSeason && (
                    <Text className="text-[#B366FF] text-[11px] mt-1">
                      {`Tap to choose from ${seasonsList.length} seasons`}
                    </Text>
                  )}
                </View>
                {canPickSeason ? (
                  <ChevronDown color="#B366FF" size={20} />
                ) : (
                  <View className="bg-[#B366FF]/20 px-3 py-1.5 rounded-full border border-[#B366FF]/30">
                    <Text className="text-[#B366FF] text-xs font-semibold">Open</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* League Logo Upload Card */}
            <View className="mb-6 items-center">
              <TouchableOpacity
                className="w-24 h-24 rounded-3xl border-2 border-dashed border-[#B366FF] bg-[#120824] justify-center items-center overflow-hidden shadow-lg"
                onPress={handlePickLogo}
                disabled={isUploadingLogo || isCreating}
                activeOpacity={0.8}
              >
                {isUploadingLogo ? (
                  <ActivityIndicator color="#B366FF" size="small" />
                ) : logoImageUri ? (
                  <Image source={{ uri: logoImageUri }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="items-center justify-center">
                    <Camera color="#B366FF" size={28} />
                    <Text className="text-[#B366FF] text-[11px] font-bold mt-1">Upload Logo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text className="text-gray-400 text-xs mt-2">Tap to upload League Logo (AWS S3)</Text>
            </View>

            <Text className="text-white font-bold text-lg mb-4">General Settings</Text>



            <View className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-4">
              <Shield color="#999" size={20} style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-white text-base h-full"
                placeholder="League Name"
                placeholderTextColor="#999"
                value={leagueName}
                onChangeText={setLeagueName}
                autoCapitalize="words"
              />
            </View>

            <View className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-4">
              <User color="#999" size={20} style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-white text-base h-full"
                placeholder="Your Fantasy Team Name"
                placeholderTextColor="#999"
                value={fantasyTeamName}
                onChangeText={setFantasyTeamName}
                autoCapitalize="words"
              />
            </View>

            <View className="border border-[#B366FF] rounded-2xl bg-[#0a0a0a] px-4 py-3 mb-4 min-h-[100px]">
              <TextInput
                className="flex-1 text-white text-base"
                placeholder="League Description (Optional)"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row justify-between mb-6">
              <TouchableOpacity 
                className={`flex-1 flex-row items-center justify-center border rounded-xl py-3 mr-2 ${visibility === 'public' ? 'border-[#B366FF] bg-[#8B3DFF]/20' : 'border-[#333] bg-[#0a0a0a]'}`}
                onPress={() => setVisibility('public')}
              >
                <Unlock color={visibility === 'public' ? '#B366FF' : '#999'} size={18} style={{ marginRight: 8 }} />
                <Text className={visibility === 'public' ? 'text-[#B366FF] font-semibold' : 'text-[#999]'}>Public</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className={`flex-1 flex-row items-center justify-center border rounded-xl py-3 ml-2 ${visibility === 'private' ? 'border-[#B366FF] bg-[#8B3DFF]/20' : 'border-[#333] bg-[#0a0a0a]'}`}
                onPress={() => setVisibility('private')}
              >
                <Lock color={visibility === 'private' ? '#B366FF' : '#999'} size={18} style={{ marginRight: 8 }} />
                <Text className={visibility === 'private' ? 'text-[#B366FF] font-semibold' : 'text-[#999]'}>Private</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-8" activeOpacity={0.8} onPress={() => setIsMemberModalVisible(true)}>
              <Users color="#999" size={20} style={{ marginRight: 12 }} />
              <Text className="flex-1 text-white text-base">{maxTeams} Teams</Text>
              <ChevronDown color="#999" size={20} style={{ marginLeft: 12 }} />
            </TouchableOpacity>

            <Text className="text-white font-bold text-lg mb-4">Draft Settings</Text>
            
            <Text className="text-[#ccc] text-sm mb-2 ml-1">Draft Type</Text>
            <TouchableOpacity className="flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mb-4" activeOpacity={0.8} onPress={() => setIsDraftTypeModalVisible(true)}>
              <Text className="flex-1 text-white text-base capitalize">{draftType}</Text>
              <ChevronDown color="#999" size={20} />
            </TouchableOpacity>

            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-[#ccc] text-sm mb-2 ml-1">Starting Budget</Text>
                <TextInput
                  className="border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[50px] px-4 text-white text-base"
                  value={startingBudget}
                  onChangeText={setStartingBudget}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1 mx-1">
                <Text className="text-[#ccc] text-sm mb-2 ml-1">Min Bid</Text>
                <TextInput
                  className="border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[50px] px-4 text-white text-base"
                  value={minimumBid}
                  onChangeText={setMinimumBid}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-[#ccc] text-sm mb-2 ml-1">Increment</Text>
                <TextInput
                  className="border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[50px] px-4 text-white text-base"
                  value={bidIncrement}
                  onChangeText={setBidIncrement}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-[#ccc] text-sm mb-2 ml-1">Nomination Time (s)</Text>
                <TextInput
                  className="border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[50px] px-4 text-white text-base"
                  value={nominationSeconds}
                  onChangeText={setNominationSeconds}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-[#ccc] text-sm mb-2 ml-1">Bidding Time (s)</Text>
                <TextInput
                  className="border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[50px] px-4 text-white text-base"
                  value={biddingSeconds}
                  onChangeText={setBiddingSeconds}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-[#ccc] text-sm mb-2 ml-1">Draft Duration (minutes - min 5 mins)</Text>
              <TextInput
                className="border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[50px] px-4 text-white text-base"
                value={draftDurationMinutes}
                onChangeText={setDraftDurationMinutes}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor="#666"
              />
            </View>

            <Text className="text-white font-bold text-lg mb-4">Schedule Draft</Text>

            <View className="flex-row justify-between mb-6">
              <TouchableOpacity
                className="flex-1 flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 mr-2"
                activeOpacity={0.8}
                onPress={() => setOpenDatePicker(true)}
              >
                <Calendar color="#999" size={18} style={{ marginRight: 8 }} />
                <Text className={`flex-1 text-sm ${draftDate ? 'text-white' : 'text-[#555]'}`}>
                  {draftDate ? formatDate(draftDate) : 'Date'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 flex-row items-center border border-[#B366FF] rounded-2xl bg-[#0a0a0a] h-[60px] px-4 ml-2"
                activeOpacity={0.8}
                onPress={() => setOpenTimePicker(true)}
              >
                <Clock color="#999" size={18} style={{ marginRight: 8 }} />
                <Text className={`flex-1 text-sm ${draftTime ? 'text-white' : 'text-[#555]'}`}>
                  {draftTime ? formatTimeStr(draftTime) : 'Time'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Bottom Button */}
        {hasSeason && (
          <View className="px-5 pb-[30px] pt-2.5">
            <TouchableOpacity
              className={`bg-[#8B3DFF] rounded-[30px] h-14 justify-center items-center ${
                isCreating || isLoadingSeasons ? 'opacity-50' : ''
              }`}
              activeOpacity={0.8}
              onPress={handleCreateLeague}
              disabled={isCreating || isLoadingSeasons}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">Create League</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Modals */}
        <Modal visible={isSeasonModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsSeasonModalVisible(false)}>
          <TouchableOpacity className="flex-1 bg-black/50 justify-center items-center" activeOpacity={1} onPress={() => setIsSeasonModalVisible(false)}>
            <View className="bg-[#1a1a1a] rounded-2xl w-4/5 max-h-[60%] p-5 border border-[#333]">
              <Text className="text-white text-lg font-semibold mb-4 text-center">Target Season</Text>
              <FlatList
                data={seasonsList}
                keyExtractor={(item) => String(item._id || item.id)}
                renderItem={({ item }) => {
                  const id = String(item._id || item.id);
                  const isSelected = id === selectedSeasonId;
                  const closes = formatDeadline(item.registrationEndsAt);
                  return (
                    <TouchableOpacity
                      className="py-3 border-b border-[#333]"
                      onPress={() => { setSelectedSeasonId(id); setIsSeasonModalVisible(false); }}
                    >
                      <Text className={`text-base ${isSelected ? 'text-[#B366FF] font-semibold' : 'text-white'}`}>
                        {item.name}
                      </Text>
                      {!!closes && (
                        <Text className="text-[#777] text-xs mt-0.5">{`Registration closes ${closes}`}</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
                className="grow-0"
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={isMemberModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsMemberModalVisible(false)}>
          <TouchableOpacity className="flex-1 bg-black/50 justify-center items-center" activeOpacity={1} onPress={() => setIsMemberModalVisible(false)}>
            <View className="bg-[#1a1a1a] rounded-2xl w-4/5 max-h-[60%] p-5 border border-[#333]">
              <Text className="text-white text-lg font-semibold mb-4 text-center">Max Teams</Text>
              <FlatList
                data={memberOptions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="py-3 border-b border-[#333] items-center"
                    onPress={() => { setMaxTeams(item); setIsMemberModalVisible(false); }}
                  >
                    <Text className={`text-base ${maxTeams === item ? 'text-[#B366FF] font-semibold' : 'text-[#999]'}`}>{item} Teams</Text>
                  </TouchableOpacity>
                )}
                className="grow-0"
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={isDraftTypeModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsDraftTypeModalVisible(false)}>
          <TouchableOpacity className="flex-1 bg-black/50 justify-center items-center" activeOpacity={1} onPress={() => setIsDraftTypeModalVisible(false)}>
            <View className="bg-[#1a1a1a] rounded-2xl w-4/5 p-5 border border-[#333]">
              <Text className="text-white text-lg font-semibold mb-4 text-center">Draft Type</Text>
              {draftTypeOptions.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  className="py-3 border-b border-[#333] items-center"
                  disabled={!item.supported}
                  onPress={() => { setDraftType(item.value); setIsDraftTypeModalVisible(false); }}
                >
                  <Text
                    className={`text-base capitalize ${
                      !item.supported
                        ? 'text-[#555]'
                        : draftType === item.value
                        ? 'text-[#B366FF] font-semibold'
                        : 'text-[#999]'
                    }`}
                  >
                    {item.value}
                  </Text>
                  {!item.supported && (
                    <Text className="text-[#555] text-[11px] mt-0.5">Not supported yet</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date Pickers */}
        <DatePicker modal open={openDatePicker} date={draftDate || new Date()} mode="date" theme="dark"
          onConfirm={(date) => { setOpenDatePicker(false); setDraftDate(date); }}
          onCancel={() => { setOpenDatePicker(false); }}
        />
        <DatePicker modal open={openTimePicker} date={draftTime || new Date()} mode="time" theme="dark"
          onConfirm={(date) => { setOpenTimePicker(false); setDraftTime(date); }}
          onCancel={() => { setOpenTimePicker(false); }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
