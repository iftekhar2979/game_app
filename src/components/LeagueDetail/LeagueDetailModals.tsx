import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft, ChevronDown, User, Plus, Minus, Unlock, ShieldAlert, Calendar } from 'lucide-react-native';
import DatePicker from 'react-native-date-picker';
import { useGetRosterSettingsQuery, useUpdateRosterSettingsMutation, useUpdateLeagueMutation, useGetScoringSettingsQuery, useGetLeagueMembersQuery, useRemoveLeagueMemberMutation, useUpdateMemberRoleMutation } from '../../store/api/leagueApi';
import { useAddFantasyCheerFreeAgentMutation, useReleaseFantasyCheerTeamMutation, useUpdateFantasyCheerLineupMutation } from '../../store/api/cheerApi';
import type { LeagueStatusValue } from '../../store/api/leagueApi';
import { showToast } from '../../utils/toast';

export interface LeagueSettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onOptionSelect?: (optionTitle: string) => void;
}

export interface LeagueSettingsSubModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export interface RosterSettingsSubModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export interface MemberSettingsSubModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export interface AddTeamModalProps {
  isVisible: boolean;
  onClose: () => void;
  teamMembers: Array<{ id: string; name: string; handle: string; avatarUri?: string }>;
  onAddTeam: (team: any) => void;
}

export interface PlayerDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPlayer: any;
  seasonId?: string;
  leagueId: string;
  userTeamId?: string;
  onAddSuccess?: () => void;
}

export interface GiveCommissionerAccessModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export interface LockRosterModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export interface DeleteLeagueModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export const LeagueSettingsModal = ({ isVisible, onClose, onOptionSelect }: LeagueSettingsModalProps) => {

  const SETTINGS_OPTIONS = [
    { id: '1', title: 'League settings' },
    { id: '2', title: 'Team settings' },
    { id: '3', title: 'Roster settings' },
    { id: '4', title: 'Scoring settings' },
    { id: '5', title: 'Draft settings' },
    { id: '6', title: 'Member settings' },
    { id: '7', title: 'Commissioner control' },
    { id: '8', title: 'Delete league', isDanger: true },
  ];

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/50 justify-center items-center px-6" 
        onPress={onClose}
      >
        <Pressable className="w-full bg-[#1e1e1e] rounded-[16px] border border-[#333] overflow-hidden">
          {SETTINGS_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={`${option.id}-${index}`}
              className={`p-4 ${index !== SETTINGS_OPTIONS.length - 1 ? 'border-b border-[#333]' : ''}`}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                if (onOptionSelect) onOptionSelect(option.title);
              }}
            >
              <Text className={`${option.isDanger ? 'text-[#ff4444]' : 'text-white'} text-[16px]`}>
                {option.title}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const STATUS_OPTIONS: { value: LeagueStatusValue; label: string; hint: string }[] = [
  { value: 'draft', label: 'Draft', hint: 'Not published yet' },
  { value: 'registration_open', label: 'Registration open', hint: 'Managers can join' },
  { value: 'registration_closed', label: 'Registration closed', hint: 'Roster is set, draft can be scheduled' },
  { value: 'auction_scheduled', label: 'Auction scheduled', hint: 'Draft picks allowed' },
  { value: 'auction_active', label: 'Auction active', hint: 'Draft picks allowed' },
  { value: 'active', label: 'Active', hint: 'Normal play — free agent adds allowed' },
  { value: 'completed', label: 'Completed', hint: 'Locks all league settings' },
  { value: 'cancelled', label: 'Cancelled', hint: 'Locks all league settings' },
];

const SettingsField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View className="mb-4">
    <Text className="text-gray-400 text-[12px] mb-2">{label}</Text>
    {children}
  </View>
);

export const LeagueSettingsSubModal = ({ isVisible, onClose, leagueId, league, canEdit }: any) => {
  const [updateLeague, { isLoading: isSaving }] = useUpdateLeagueMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxTeams, setMaxTeams] = useState('');
  const [status, setStatus] = useState<LeagueStatusValue | ''>('');
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);

  // The parent rebuilds `league` on every render and re-renders once a second for
  // the draft countdown, so this must not depend on the league object itself —
  // doing so would overwrite whatever is being typed. Seed on open only.
  const leagueRef = useRef(league);
  leagueRef.current = league;

  useEffect(() => {
    if (!isVisible) return;
    const current = leagueRef.current;
    if (!current) return;
    setName(current.name || '');
    setDescription(current.description || '');
    setMaxTeams(String(current.maxTeams ?? ''));
    setStatus((current.rawStatus || current.status || '') as LeagueStatusValue);
    setIsStatusPickerOpen(false);
  }, [isVisible]);

  const isTerminal = status === 'completed' || status === 'cancelled';
  const currentStatus = (league?.rawStatus || league?.status || '') as string;
  const isLockedByStatus = currentStatus === 'completed' || currentStatus === 'cancelled';
  const editable = canEdit !== false && !isLockedByStatus;

  const parsedMaxTeams = parseInt(maxTeams, 10);
  const isDirty =
    !!league &&
    (name !== (league.name || '') ||
      description !== (league.description || '') ||
      parsedMaxTeams !== league.maxTeams ||
      status !== currentStatus);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast.error('Name required', 'Give the league a name before saving.');
      return;
    }
    if (Number.isNaN(parsedMaxTeams) || parsedMaxTeams < 4 || parsedMaxTeams > 20) {
      showToast.error('Invalid capacity', 'Teams must be between 4 and 20.');
      return;
    }

    try {
      await updateLeague({
        id: leagueId,
        name: name.trim(),
        description: description.trim(),
        maxTeams: parsedMaxTeams,
        ...(status ? { status: status as LeagueStatusValue } : {}),
      }).unwrap();

      showToast.success('League updated', `Settings saved for ${name.trim()}.`);
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update the league.';
      showToast.error('Update Failed', Array.isArray(msg) ? msg.join('\n') : msg);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[20px] font-medium">League settings</Text>
        </View>

        {!editable && (
          <View className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-3 mb-4">
            <Text className="text-gray-400 text-[12px]">
              {isLockedByStatus
                ? `Settings cannot be changed once a league is ${currentStatus}.`
                : 'Only the league commissioner can change these settings.'}
            </Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <SettingsField label="League name">
            <TextInput
              className="border border-[#8B3DFF] rounded-[16px] px-4 h-[56px] text-white text-[14px]"
              value={name}
              onChangeText={setName}
              editable={editable}
              placeholder="League name"
              placeholderTextColor="#666"
            />
          </SettingsField>

          <SettingsField label="Description">
            <TextInput
              className="border border-[#333] rounded-[16px] px-4 py-3 text-white text-[14px] min-h-[80px]"
              value={description}
              onChangeText={setDescription}
              editable={editable}
              multiline
              textAlignVertical="top"
              placeholder="What is this league about?"
              placeholderTextColor="#666"
            />
          </SettingsField>

          <SettingsField label="Maximum teams (4–20)">
            <TextInput
              className="border border-[#333] rounded-[16px] px-4 h-[56px] text-white text-[14px]"
              value={maxTeams}
              onChangeText={setMaxTeams}
              editable={editable}
              keyboardType="number-pad"
              placeholder="12"
              placeholderTextColor="#666"
            />
            {!!league?.joinedTeamCount && (
              <Text className="text-gray-500 text-[11px] mt-1.5">
                {`${league.joinedTeamCount} teams have joined — capacity cannot go below that.`}
              </Text>
            )}
          </SettingsField>

          <SettingsField label="League status">
            <TouchableOpacity
              className="border border-[#333] rounded-[16px] flex-row items-center justify-between px-4 h-[56px]"
              disabled={!editable}
              onPress={() => setIsStatusPickerOpen((open) => !open)}
              activeOpacity={0.7}
            >
              <Text className="text-white text-[14px]">
                {STATUS_OPTIONS.find((o) => o.value === status)?.label || 'Select status'}
              </Text>
              <ChevronDown color="#ccc" size={20} />
            </TouchableOpacity>

            {isStatusPickerOpen && (
              <View className="border border-[#333] rounded-[16px] mt-2 overflow-hidden">
                {STATUS_OPTIONS.map((option, index) => {
                  const isSelected = option.value === status;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      className={`px-4 py-3 ${index !== STATUS_OPTIONS.length - 1 ? 'border-b border-[#262626]' : ''} ${
                        isSelected ? 'bg-[#8B3DFF]/15' : ''
                      }`}
                      onPress={() => {
                        setStatus(option.value);
                        setIsStatusPickerOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className={`${isSelected ? 'text-[#8B3DFF]' : 'text-white'} text-[14px] font-medium`}>
                        {option.label}
                      </Text>
                      <Text className="text-gray-500 text-[11px] mt-0.5">{option.hint}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {isTerminal && status !== currentStatus && (
              <Text className="text-amber-400 text-[11px] mt-2">
                Saving this locks every league setting, including this screen.
              </Text>
            )}
          </SettingsField>
        </ScrollView>

        {editable && (
          <View className="py-8 bg-black">
            <TouchableOpacity
              className={`rounded-full h-[56px] justify-center items-center ${
                isDirty && !isSaving ? 'bg-[#8B3DFF]' : 'bg-[#3a2a5c]'
              }`}
              disabled={!isDirty || isSaving}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-[16px] font-medium">
                  {isDirty ? 'Save changes' : 'No changes to save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const NumberField = ({
  label,
  hint,
  value,
  onChangeText,
  editable,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (next: string) => void;
  editable: boolean;
}) => (
  <View className="mb-4">
    <Text className="text-gray-400 text-[12px] mb-2">{label}</Text>
    <TextInput
      className="border border-[#333] rounded-[16px] px-4 h-[56px] text-white text-[14px]"
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      keyboardType="number-pad"
      placeholderTextColor="#666"
    />
    {!!hint && <Text className="text-gray-500 text-[11px] mt-1.5">{hint}</Text>}
  </View>
);

export const DraftSettingsSubModal = ({ isVisible, onClose, leagueId, league, canEdit }: any) => {
  const [updateLeague, { isLoading: isSaving }] = useUpdateLeagueMutation();

  const settings = league?.draftSettings || {};

  const [startingBudget, setStartingBudget] = useState('');
  const [minimumBid, setMinimumBid] = useState('');
  const [bidIncrement, setBidIncrement] = useState('');
  const [nominationSeconds, setNominationSeconds] = useState('');
  const [biddingSeconds, setBiddingSeconds] = useState('');
  const [pickSeconds, setPickSeconds] = useState('');
  const [draftStartsAt, setDraftStartsAt] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Seed on open only — see the note in LeagueSettingsSubModal.
  const leagueRef = useRef(league);
  leagueRef.current = league;

  useEffect(() => {
    if (!isVisible) return;
    const d = leagueRef.current?.draftSettings;
    if (!d) return;
    setStartingBudget(String(d.startingBudget ?? ''));
    setMinimumBid(String(d.minimumBid ?? ''));
    setBidIncrement(String(d.bidIncrement ?? ''));
    setNominationSeconds(String(d.nominationDurationSeconds ?? ''));
    setBiddingSeconds(String(d.biddingDurationSeconds ?? ''));
    setPickSeconds(String(d.pickDurationSeconds ?? ''));
    setDraftStartsAt(d.draftStartsAt ? new Date(d.draftStartsAt) : null);
    setIsDatePickerOpen(false);
  }, [isVisible]);

  const currentStatus = (league?.rawStatus || league?.status || '') as string;
  const isLockedByStatus = currentStatus === 'completed' || currentStatus === 'cancelled';
  const editable = canEdit !== false && !isLockedByStatus;

  const originalDate = settings.draftStartsAt ? new Date(settings.draftStartsAt).getTime() : null;
  const isDirty =
    !!league &&
    (startingBudget !== String(settings.startingBudget ?? '') ||
      minimumBid !== String(settings.minimumBid ?? '') ||
      bidIncrement !== String(settings.bidIncrement ?? '') ||
      nominationSeconds !== String(settings.nominationDurationSeconds ?? '') ||
      biddingSeconds !== String(settings.biddingDurationSeconds ?? '') ||
      pickSeconds !== String(settings.pickDurationSeconds ?? '') ||
      (draftStartsAt?.getTime() ?? null) !== originalDate);

  const handleSave = async () => {
    const budget = parseInt(startingBudget, 10);
    const bid = parseInt(minimumBid, 10);
    const increment = parseInt(bidIncrement, 10);

    if ([budget, bid, increment].some((n) => Number.isNaN(n) || n < 1)) {
      showToast.error('Invalid amounts', 'Budget, minimum bid and increment must be at least 1.');
      return;
    }
    if (bid > budget || increment > budget) {
      showToast.error('Invalid amounts', 'Minimum bid and increment cannot exceed the starting budget.');
      return;
    }

    // Only send the date when it changed; the server rejects a past date it is
    // being asked to set, but leaves an existing one alone.
    const dateChanged = (draftStartsAt?.getTime() ?? null) !== originalDate;

    try {
      await updateLeague({
        id: leagueId,
        draftSettings: {
          startingBudget: budget,
          minimumBid: bid,
          bidIncrement: increment,
          nominationDurationSeconds: Math.min(300, Math.max(10, parseInt(nominationSeconds, 10) || 30)),
          biddingDurationSeconds: Math.min(300, Math.max(10, parseInt(biddingSeconds, 10) || 30)),
          pickDurationSeconds: Math.min(600, Math.max(1, parseInt(pickSeconds, 10) || 60)),
          ...(dateChanged && draftStartsAt ? { draftStartsAt: draftStartsAt.toISOString() } : {}),
        },
      }).unwrap();

      showToast.success('Draft settings saved', 'Auction rules updated for this league.');
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update draft settings.';
      showToast.error('Update Failed', Array.isArray(msg) ? msg.join('\n') : msg);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-[20px] font-medium">Draft settings</Text>
            <Text className="text-gray-400 text-[12px]">Auction draft</Text>
          </View>
        </View>

        {!editable && (
          <View className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-3 mb-4">
            <Text className="text-gray-400 text-[12px]">
              {isLockedByStatus
                ? `Draft settings cannot be changed once a league is ${currentStatus}.`
                : 'Only the league commissioner can change draft settings.'}
            </Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <NumberField
            label="Starting budget"
            hint="Credits each team gets for the auction"
            value={startingBudget}
            onChangeText={setStartingBudget}
            editable={editable}
          />
          <NumberField
            label="Minimum bid"
            value={minimumBid}
            onChangeText={setMinimumBid}
            editable={editable}
          />
          <NumberField
            label="Bid increment"
            value={bidIncrement}
            onChangeText={setBidIncrement}
            editable={editable}
          />
          <NumberField
            label="Nomination timer (seconds)"
            hint="10–300"
            value={nominationSeconds}
            onChangeText={setNominationSeconds}
            editable={editable}
          />
          <NumberField
            label="Bidding timer (seconds)"
            hint="10–300"
            value={biddingSeconds}
            onChangeText={setBiddingSeconds}
            editable={editable}
          />
          <NumberField
            label="Pick timer (seconds)"
            hint="1–600"
            value={pickSeconds}
            onChangeText={setPickSeconds}
            editable={editable}
          />

          <View className="mb-8">
            <Text className="text-gray-400 text-[12px] mb-2">Draft starts at</Text>
            <TouchableOpacity
              className="border border-[#333] rounded-[16px] flex-row items-center justify-between px-4 h-[56px]"
              disabled={!editable}
              onPress={() => setIsDatePickerOpen(true)}
              activeOpacity={0.7}
            >
              <Text className={`${draftStartsAt ? 'text-white' : 'text-gray-500'} text-[14px]`}>
                {draftStartsAt ? draftStartsAt.toLocaleString() : 'Not scheduled'}
              </Text>
              <Calendar color="#ccc" size={18} />
            </TouchableOpacity>
            <Text className="text-gray-500 text-[11px] mt-1.5">
              A new draft time must be in the future and on or before the season start.
            </Text>
          </View>
        </ScrollView>

        {editable && (
          <View className="py-8 bg-black">
            <TouchableOpacity
              className={`rounded-full h-[56px] justify-center items-center ${
                isDirty && !isSaving ? 'bg-[#8B3DFF]' : 'bg-[#3a2a5c]'
              }`}
              disabled={!isDirty || isSaving}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-[16px] font-medium">
                  {isDirty ? 'Save changes' : 'No changes to save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <DatePicker
          modal
          open={isDatePickerOpen}
          date={draftStartsAt || new Date()}
          mode="datetime"
          theme="dark"
          onConfirm={(date) => {
            setIsDatePickerOpen(false);
            setDraftStartsAt(date);
          }}
          onCancel={() => setIsDatePickerOpen(false)}
        />
      </View>
    </Modal>
  );
};

const Stepper = ({
  value,
  onChange,
  min = 0,
  max = 50,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) => (
  <View className="flex-row items-center bg-[#333] rounded-full px-2 py-1.5 w-[104px] justify-between">
    <TouchableOpacity
      className={`w-6 h-6 rounded-full items-center justify-center ${
        disabled || value <= min ? 'bg-[#555]' : 'bg-[#e0e0e0]'
      }`}
      disabled={disabled || value <= min}
      onPress={() => onChange(value - 1)}
      activeOpacity={0.7}
    >
      <Minus color={disabled || value <= min ? '#888' : '#000'} size={16} />
    </TouchableOpacity>
    <Text className="text-white mx-2 font-medium">{value}</Text>
    <TouchableOpacity
      className={`w-6 h-6 rounded-full items-center justify-center ${
        disabled || value >= max ? 'bg-[#555]' : 'bg-[#e0e0e0]'
      }`}
      disabled={disabled || value >= max}
      onPress={() => onChange(value + 1)}
      activeOpacity={0.7}
    >
      <Plus color={disabled || value >= max ? '#888' : '#000'} size={16} />
    </TouchableOpacity>
  </View>
);

export const RosterSettingsSubModal = ({ isVisible, onClose, leagueId, league, canEdit }: any) => {
  const [updateLeague, { isLoading: isSaving }] = useUpdateLeagueMutation();
  const settings = league?.fantasyCheerSettings || {};
  const [rosterSize, setRosterSize] = useState(6);
  const [starterCount, setStarterCount] = useState(4);

  useEffect(() => {
    if (isVisible) {
      setRosterSize(Number(settings.rosterSize || 6));
      setStarterCount(Number(settings.starterCount || 4));
    }
  }, [isVisible, settings.rosterSize, settings.starterCount]);

  const save = async () => {
    try {
      await updateLeague({ id: leagueId, fantasyCheerSettings: { rosterSize, starterCount } }).unwrap();
      showToast.success('Cheer roster saved', `${starterCount} starters and ${rosterSize - starterCount} bench teams.`);
      onClose();
    } catch (err: any) {
      showToast.error('Save Failed', err?.data?.message || err?.message);
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-[20px] font-medium">Fantasy cheer roster</Text>
            <Text className="text-gray-400 text-[12px]">Real cheer teams per fantasy manager</Text>
          </View>
        </View>
        <View className="bg-[#111] border border-[#222] rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-1 mr-4">
              <Text className="text-white text-[15px] font-semibold">Roster size</Text>
              <Text className="text-gray-500 text-[11px]">Starters plus bench cheer teams</Text>
            </View>
            <Stepper value={rosterSize} min={1} max={30} disabled={!canEdit} onChange={(value) => {
              setRosterSize(value);
              setStarterCount((current) => Math.min(current, value));
            }} />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white text-[15px] font-semibold">Active starters</Text>
              <Text className="text-gray-500 text-[11px]">Only starters score at performance time</Text>
            </View>
            <Stepper value={starterCount} min={1} max={rosterSize} disabled={!canEdit} onChange={setStarterCount} />
          </View>
        </View>
        {canEdit ? (
          <TouchableOpacity className="bg-[#8B3DFF] rounded-full h-[54px] justify-center items-center" onPress={save} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-[15px] font-bold">Save cheer roster</Text>}
          </TouchableOpacity>
        ) : <Text className="text-gray-500 text-[12px]">Only the commissioner can edit this setting.</Text>}
      </View>
    </Modal>
  );
};

const LegacyRosterSettingsSubModal = ({ isVisible, onClose, leagueId }: any) => {
  const { data, isLoading, isError, error, refetch } = useGetRosterSettingsQuery(leagueId, {
    skip: !isVisible || !leagueId,
    refetchOnMountOrArgChange: true,
  });
  const [updateRosterSettings, { isLoading: isSaving }] = useUpdateRosterSettingsMutation();

  const [slots, setSlots] = useState<any[]>([]);
  const [benchSize, setBenchSize] = useState(0);

  // Reset the draft whenever fresh settings arrive, so an abandoned edit is discarded.
  useEffect(() => {
    if (data) {
      setSlots(data.slots.map((slot: any) => ({ ...slot })));
      setBenchSize(data.benchSize);
    }
  }, [data]);

  const canEdit = !!data?.canEdit;
  const starterTotal = useMemo(
    () => slots.reduce((sum, slot) => sum + slot.starterCount, 0),
    [slots],
  );
  const totalRosterSize = starterTotal + benchSize;

  const isDirty = useMemo(() => {
    if (!data) return false;
    if (benchSize !== data.benchSize) return true;
    return slots.some((slot, idx) => {
      const original = data.slots[idx];
      return (
        !original ||
        slot.starterCount !== original.starterCount ||
        slot.minimum !== original.minimum ||
        slot.maximum !== original.maximum
      );
    });
  }, [slots, benchSize, data]);

  const updateSlot = (positionId: string, field: string, next: number) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.positionId !== positionId) return slot;
        const updated = { ...slot, [field]: next };
        // Keep each slot internally consistent: minimum <= starters <= maximum.
        if (field === 'maximum') {
          updated.starterCount = Math.min(updated.starterCount, next);
          updated.minimum = Math.min(updated.minimum, next);
        } else {
          updated.maximum = Math.max(updated.maximum, next);
        }
        return updated;
      }),
    );
  };

  const handleSave = async () => {
    try {
      await updateRosterSettings({
        leagueId,
        benchSize,
        slots: slots.map((slot) => ({
          positionId: slot.positionId,
          minimum: slot.minimum,
          maximum: slot.maximum,
          starterCount: slot.starterCount,
        })),
      }).unwrap();

      showToast.success('Roster settings saved', `Teams now carry ${totalRosterSize} players.`);
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to save roster settings.';
      showToast.error('Save Failed', msg);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-[20px] font-medium">Roster settings</Text>
            {!!data && (
              <Text className="text-gray-400 text-[12px]">
                {`${starterTotal} starters + ${benchSize} bench = ${totalRosterSize} per team`}
              </Text>
            )}
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8B3DFF" />
            <Text className="text-gray-400 text-[13px] mt-3">Loading roster settings...</Text>
          </View>
        ) : isError || !data ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-white text-[15px] font-semibold mb-2">Settings unavailable</Text>
            <Text className="text-gray-400 text-[12px] text-center mb-4">
              {(error as any)?.data?.message || 'Roster settings could not be loaded.'}
            </Text>
            <TouchableOpacity className="bg-[#8B3DFF] px-5 py-2.5 rounded-full" onPress={() => refetch()}>
              <Text className="text-white text-[13px] font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!canEdit && (
              <View className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-3 mb-4">
                <Text className="text-gray-400 text-[12px]">
                  {data.lockedReason || 'Only the league commissioner can change roster settings.'}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              <View className="flex-row px-1 mb-2">
                <Text className="text-gray-500 text-[10px] uppercase font-bold w-[104px]">Starters</Text>
                <Text className="text-gray-500 text-[10px] uppercase font-bold ml-4 flex-1">Position</Text>
                <Text className="text-gray-500 text-[10px] uppercase font-bold">Max</Text>
              </View>

              {slots.map((slot, idx) => (
                <View key={`${slot.positionId}-${idx}`} className="flex-row items-center mb-4">
                  <Stepper
                    value={slot.starterCount}
                    min={0}
                    max={slot.maximum}
                    disabled={!canEdit}
                    onChange={(next) => updateSlot(slot.positionId, 'starterCount', next)}
                  />
                  <View className="flex-1 mx-4">
                    <Text className="text-white text-[13px]" numberOfLines={1}>
                      {slot.name || slot.code || 'Position'}
                    </Text>
                    <Text className="text-gray-500 text-[11px]">
                      {`${slot.code ? `${slot.code} • ` : ''}min ${slot.minimum}`}
                    </Text>
                  </View>
                  <Stepper
                    value={slot.maximum}
                    min={Math.max(slot.starterCount, slot.minimum)}
                    disabled={!canEdit}
                    onChange={(next) => updateSlot(slot.positionId, 'maximum', next)}
                  />
                </View>
              ))}

              <View className="flex-row items-center mb-4 pt-4 border-t border-[#222]">
                <Stepper value={benchSize} min={0} disabled={!canEdit} onChange={setBenchSize} />
                <View className="flex-1 ml-4">
                  <Text className="text-white text-[13px]">Bench</Text>
                  <Text className="text-gray-500 text-[11px]">Reserves beyond the starting lineup</Text>
                </View>
              </View>
            </ScrollView>

            {canEdit && (
              <View className="py-8 bg-black">
                <TouchableOpacity
                  className={`rounded-full h-[56px] justify-center items-center ${
                    isDirty && !isSaving ? 'bg-[#8B3DFF]' : 'bg-[#3a2a5c]'
                  }`}
                  disabled={!isDirty || isSaving}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-[16px] font-medium">
                      {isDirty ? 'Save changes' : 'No changes to save'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
};

const METRIC_LABELS: Record<string, string> = {
  PASS_YARDS: 'Passing yards',
  PASS_TD: 'Passing touchdown',
  RUSH_YARDS: 'Rushing yards',
  RUSH_TD: 'Rushing touchdown',
  RECEPTION: 'Reception',
  REC_YARDS: 'Receiving yards',
  REC_TD: 'Receiving touchdown',
  INT: 'Interception thrown',
  FUMBLE_LOST: 'Fumble lost',
};

/** PASS_YARDS -> Pass yards, for codes we have no friendly label for. */
const humanise = (code: string) =>
  METRIC_LABELS[code] ||
  code.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const formatRuleValue = (rule: any) => {
  if (rule.calculationType === 'multiplier' && rule.multiplier !== null) {
    return `${rule.multiplier} / unit`;
  }
  if (rule.calculationType === 'placement_table') {
    const count = rule.placementPoints ? Object.keys(rule.placementPoints).length : 0;
    return count ? `${count} placements` : 'Placement table';
  }
  if (rule.points !== null && rule.points !== undefined) {
    return `${rule.points > 0 ? '+' : ''}${rule.points} pts`;
  }
  return '—';
};

export const ScoringSettingsSubModal = ({ isVisible, onClose, leagueId, league, canEdit }: any) => {
  const [updateLeague, { isLoading: isSaving }] = useUpdateLeagueMutation();
  const settings = useMemo(() => league?.fantasyCheerSettings || {}, [league?.fantasyCheerSettings]);
  const [values, setValues] = useState<any>({});

  useEffect(() => {
    if (isVisible) setValues({
      regularSeasonPeriods: Number(settings.regularSeasonPeriods || 10),
      officialScoreMultiplier: Number(settings.officialScoreMultiplier ?? 1),
      deductionMultiplier: Number(settings.deductionMultiplier ?? 1),
      hitZeroBonus: Number(settings.hitZeroBonus ?? 5),
      advancementBonus: Number(settings.advancementBonus ?? 3),
      championshipBonus: Number(settings.championshipBonus ?? 10),
      placementPoints: settings.placementPoints || { '1': 20, '2': 12, '3': 8, '4': 5, '5': 3 },
    });
  }, [isVisible, settings]);

  const setNumber = (key: string, raw: string) => {
    const number = Number(raw);
    setValues((current: any) => ({ ...current, [key]: Number.isFinite(number) ? Math.max(0, number) : 0 }));
  };

  const save = async () => {
    try {
      await updateLeague({ id: leagueId, fantasyCheerSettings: values }).unwrap();
      showToast.success('Cheer scoring saved', 'Future published routines will use these league rules.');
      onClose();
    } catch (err: any) {
      showToast.error('Save Failed', err?.data?.message || err?.message);
    }
  };

  const fields = [
    ['officialScoreMultiplier', 'Official score multiplier'],
    ['deductionMultiplier', 'Deduction multiplier'],
    ['hitZeroBonus', 'Hit-zero bonus'],
    ['advancementBonus', 'Advancement bonus'],
    ['championshipBonus', 'Championship bonus'],
  ];
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-[20px] font-medium">Fantasy cheer scoring</Text>
            <Text className="text-gray-400 text-[12px]">Official routine score plus league bonuses</Text>
          </View>
        </View>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="bg-[#111] border border-[#222] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-[14px] flex-1">Regular-season periods</Text>
              <Stepper value={values.regularSeasonPeriods || 10} min={1} max={52} disabled={!canEdit}
                onChange={(regularSeasonPeriods) => setValues((current: any) => ({ ...current, regularSeasonPeriods }))} />
            </View>
            {fields.map(([key, label]) => (
              <View key={key} className="flex-row items-center justify-between border-t border-[#222] py-3">
                <Text className="text-white text-[14px] flex-1 mr-4">{label}</Text>
                <TextInput
                  className="w-20 h-10 border border-[#333] rounded-xl text-white text-center"
                  editable={!!canEdit}
                  keyboardType="decimal-pad"
                  value={String(values[key] ?? 0)}
                  onChangeText={(raw) => setNumber(key, raw)}
                />
              </View>
            ))}
          </View>
          <Text className="text-[#E0B566] text-[12px] font-bold uppercase mt-6 mb-2">Placement bonuses</Text>
          <View className="bg-[#111] border border-[#222] rounded-2xl p-4 mb-6">
            {Object.keys(values.placementPoints || {}).sort((a, b) => Number(a) - Number(b)).map((place) => (
              <View key={place} className="flex-row items-center justify-between py-2">
                <Text className="text-white text-[14px]">Place #{place}</Text>
                <Stepper value={Number(values.placementPoints[place])} min={0} max={100} disabled={!canEdit}
                  onChange={(value) => setValues((current: any) => ({ ...current, placementPoints: { ...current.placementPoints, [place]: value } }))} />
              </View>
            ))}
          </View>
        </ScrollView>
        {canEdit && (
          <TouchableOpacity className="bg-[#8B3DFF] rounded-full h-[54px] justify-center items-center mb-8" onPress={save} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-[15px] font-bold">Save scoring</Text>}
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const LegacyScoringSettingsSubModal = ({ isVisible, onClose, leagueId }: any) => {
  const { data, isLoading, isError, error, refetch } = useGetScoringSettingsQuery(leagueId, {
    skip: !isVisible || !leagueId,
  });

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-[20px] font-medium">Scoring settings</Text>
            {!!data && (
              <Text className="text-gray-400 text-[12px]">
                {`${data.name} · v${data.version} · ${data.ruleCount} rules`}
              </Text>
            )}
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8B3DFF" />
            <Text className="text-gray-400 text-[13px] mt-3">Loading scoring rules...</Text>
          </View>
        ) : isError || !data ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-white text-[15px] font-semibold mb-2">Scoring unavailable</Text>
            <Text className="text-gray-400 text-[12px] text-center mb-4">
              {(error as any)?.data?.message || 'Scoring rules could not be loaded.'}
            </Text>
            <TouchableOpacity className="bg-[#8B3DFF] px-5 py-2.5 rounded-full" onPress={() => refetch()}>
              <Text className="text-white text-[13px] font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-3 mb-4">
              <Text className="text-gray-400 text-[12px]">{data.readOnlyReason}.</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {data.categories.map((group: any) => (
                <View key={group.category} className="mb-6">
                  <Text className="text-[#E0B566] text-[12px] font-bold uppercase tracking-wider mb-3">
                    {group.category.replace(/_/g, ' ')}
                  </Text>
                  {group.rules.map((rule: any, idx: number) => (
                    <View
                      key={`${rule.metricCode}-${idx}`}
                      className="flex-row items-center justify-between border-b border-[#222] pb-3 mb-3"
                    >
                      <View className="flex-1 mr-3">
                        <Text className="text-white text-[14px]" numberOfLines={1}>
                          {humanise(rule.metricCode)}
                        </Text>
                        <Text className="text-gray-600 text-[10px] mt-0.5">{rule.metricCode}</Text>
                      </View>
                      <Text className="text-[#8B3DFF] text-[13px] font-semibold">
                        {formatRuleValue(rule)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
              <View className="h-8" />
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
};

/** Shared row for the member-facing screens below. */
const MemberRow = ({
  member,
  right,
}: {
  member: any;
  right?: React.ReactNode;
}) => (
  <View className="flex-row items-center justify-between border-b border-[#222] py-3.5">
    <View className="flex-row items-center flex-1 mr-3">
      {member.avatarUri ? (
        <Image source={{ uri: member.avatarUri }} className="w-10 h-10 rounded-full mr-3 bg-[#222]" />
      ) : (
        <View className="w-10 h-10 rounded-full mr-3 bg-[#222] border border-[#333] justify-center items-center">
          <User color="#666" size={18} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-white text-[14px] font-medium" numberOfLines={1}>
          {member.name}
        </Text>
        <Text className="text-gray-500 text-[11px]" numberOfLines={1}>
          {member.isCommissioner ? 'Commissioner' : 'Manager'}
          {member.teamName ? ` · ${member.teamName}` : ''}
        </Text>
      </View>
    </View>
    {right}
  </View>
);

/**
 * Normalises the members endpoint into rows both member screens render.
 * The API renames the stored `creator` role to `commissioner` on the way out.
 */
const useLeagueMembers = (leagueId: string, isVisible: boolean) => {
  const { data, isLoading, isError, refetch } = useGetLeagueMembersQuery(leagueId, {
    skip: !isVisible || !leagueId,
  });

  const members = useMemo(() => {
    const raw = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
    return raw.map((m: any, idx: number) => {
      const user = m.user || (typeof m.userId === 'object' ? m.userId : {});
      const team = m.team || {};
      return {
        id: String(user._id || user.id || m.userId || m._id || idx),
        membershipId: String(m._id || idx),
        name: user.fullName || team.name || 'League manager',
        teamName: team.name || null,
        avatarUri: team.avatarUri || team.logoUrl || user.avatarUrl || null,
        isCommissioner: m.role === 'commissioner' || m.role === 'creator',
      };
    });
  }, [data]);

  return { members, isLoading, isError, refetch };
};

export const MemberSettingsSubModal = ({ isVisible, onClose, leagueId, canManage, currentUserId }: any) => {
  const { members, isLoading, isError, refetch } = useLeagueMembers(leagueId, isVisible);
  const [removeMember, { isLoading: isRemoving }] = useRemoveLeagueMemberMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const confirmRemove = (member: any) => {
    Alert.alert(
      `Remove ${member.name}?`,
      'Their fantasy team is deactivated and the league slot is freed up.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setPendingId(member.id);
            try {
              await removeMember({ leagueId, userId: member.id }).unwrap();
              showToast.success('Member removed', `${member.name} is no longer in this league.`);
            } catch (err: any) {
              showToast.error('Could not remove member', err?.data?.message || err?.message);
            } finally {
              setPendingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-[20px] font-medium">Member settings</Text>
            <Text className="text-gray-400 text-[12px]">
              {`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
            </Text>
          </View>
        </View>

        {!canManage && (
          <View className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-3 mb-4">
            <Text className="text-gray-400 text-[12px]">
              Only the league commissioner can remove members.
            </Text>
          </View>
        )}

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8B3DFF" />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-white text-[15px] font-semibold mb-2">Members unavailable</Text>
            <TouchableOpacity className="bg-[#8B3DFF] px-5 py-2.5 rounded-full mt-2" onPress={() => refetch()}>
              <Text className="text-white text-[13px] font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {members.map((member: any) => {
              const isSelf = String(member.id) === String(currentUserId);
              const removable = canManage && !member.isCommissioner && !isSelf;
              return (
                <MemberRow
                  key={member.membershipId}
                  member={member}
                  right={
                    removable ? (
                      <TouchableOpacity
                        className="border border-[#ff4444]/50 bg-[#ff4444]/10 px-3 py-1.5 rounded-full"
                        disabled={isRemoving && pendingId === member.id}
                        onPress={() => confirmRemove(member)}
                        activeOpacity={0.7}
                      >
                        {isRemoving && pendingId === member.id ? (
                          <ActivityIndicator size="small" color="#ff4444" />
                        ) : (
                          <Text className="text-[#ff4444] text-[12px] font-medium">Remove</Text>
                        )}
                      </TouchableOpacity>
                    ) : isSelf ? (
                      <Text className="text-gray-600 text-[11px]">You</Text>
                    ) : null
                  }
                />
              );
            })}
            <View className="h-8" />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export const GiveCommissionerAccessModal = ({ isVisible, onClose, leagueId, canManage, currentUserId, founderId }: any) => {
  const { members, isLoading } = useLeagueMembers(leagueId, isVisible);
  const [updateRole, { isLoading: isUpdating }] = useUpdateMemberRoleMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggle = async (member: any) => {
    const nextRole = member.isCommissioner ? 'manager' : 'creator';
    setPendingId(member.id);
    try {
      await updateRole({ leagueId, userId: member.id, role: nextRole }).unwrap();
      showToast.success(
        nextRole === 'creator' ? 'Commissioner access granted' : 'Commissioner access revoked',
        `${member.name} is now a ${nextRole === 'creator' ? 'commissioner' : 'manager'}.`,
      );
    } catch (err: any) {
      showToast.error('Could not change access', err?.data?.message || err?.message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 justify-center items-center px-5">
        <View className="w-full bg-[#1e1e1e] rounded-[28px] border border-[#333] p-6 max-h-[75%]">
          <Text className="text-white text-[19px] font-semibold text-center mb-1">
            Commissioner access
          </Text>
          <Text className="text-gray-400 text-[12px] text-center mb-5">
            Commissioners can change league and roster settings.
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#8B3DFF" style={{ marginVertical: 24 }} />
          ) : members.filter((m: any) => String(m.id) !== String(currentUserId)).length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-white text-[14px] font-semibold mb-1.5">
                No one else has joined
              </Text>
              <Text className="text-gray-400 text-[12px] text-center">
                Commissioner access can only be given to another member. Invite managers to
                this league first.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {members.map((member: any) => {
                const isSelf = String(member.id) === String(currentUserId);
                const isFounder = !!founderId && String(member.id) === String(founderId);
                return (
                  <MemberRow
                    key={member.membershipId}
                    member={member}
                    right={
                      isFounder || isSelf ? (
                        <Text className="text-gray-600 text-[11px]">
                          {isFounder ? 'Founder' : 'You'}
                        </Text>
                      ) : !canManage ? null : (
                        <TouchableOpacity
                          className={`px-3 py-1.5 rounded-full border ${
                            member.isCommissioner
                              ? 'border-[#333] bg-[#222]'
                              : 'border-[#8B3DFF]/60 bg-[#8B3DFF]/10'
                          }`}
                          disabled={isUpdating && pendingId === member.id}
                          onPress={() => toggle(member)}
                          activeOpacity={0.7}
                        >
                          {isUpdating && pendingId === member.id ? (
                            <ActivityIndicator size="small" color="#8B3DFF" />
                          ) : (
                            <Text
                              className={`text-[12px] font-medium ${
                                member.isCommissioner ? 'text-gray-300' : 'text-[#8B3DFF]'
                              }`}
                            >
                              {member.isCommissioner ? 'Revoke' : 'Grant'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )
                    }
                  />
                );
              })}
            </ScrollView>
          )}

          {!canManage && (
            <Text className="text-gray-500 text-[11px] text-center mt-4">
              Only the league founder can change commissioner access.
            </Text>
          )}

          <TouchableOpacity
            className="bg-[#8B3DFF] rounded-full h-[50px] justify-center items-center mt-5"
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text className="text-white text-[15px] font-medium">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const AddTeamModal = ({ isVisible, onClose, teamMembers, onAddTeam }: any) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/80 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="bg-[#1a1a1a] rounded-t-[32px] p-6 border-t border-[#333] h-[60%] w-full">
          <Text className="text-white text-[18px] font-medium mb-6 text-center">Add Team to slot</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {teamMembers.map((team: any, index: number) => (
              <TouchableOpacity
                key={`${team.id}-${index}`}
                className="flex-row items-center border-b border-[#333] pb-4 mb-4"
                onPress={() => onAddTeam(team)}
              >
                <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4">
                  <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
                </View>
                <View>
                  <Text className="text-white text-[15px] mb-1">{team.name}</Text>
                  <Text className="text-[#E0B566] text-[13px]">{team.handle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export const PlayerDetailModal = ({ isVisible, onClose, selectedPlayer, seasonId, leagueId, userTeamId, onAddSuccess }: PlayerDetailModalProps) => {
  void seasonId;
  const seasonCheerTeamId = selectedPlayer?.seasonCheerTeamId || selectedPlayer?._id || selectedPlayer?.id;
  const organization = selectedPlayer?.organizationId || {};
  const organizationName =
    selectedPlayer?.organizationName ||
    (typeof organization === 'object' ? organization.name || organization.shortName : '') ||
    'Independent program';
  const teamName = selectedPlayer?.name || selectedPlayer?.teamName || 'Cheer team';
  const logoUrl = selectedPlayer?.avatarUri || selectedPlayer?.photoUrl ||
    (typeof organization === 'object' ? organization.logoUrl : undefined);
  const [addFreeAgent, { isLoading: isAddingTeam }] = useAddFantasyCheerFreeAgentMutation();

  const handleAddTeam = async () => {
    if (!leagueId || !userTeamId) {
      showToast.error('Team Not Found', 'Your fantasy team was not found in this league.');
      return;
    }
    if (!seasonCheerTeamId) {
      showToast.error('Invalid Selection', 'Invalid cheer team selected.');
      return;
    }
    try {
      await addFreeAgent({
        leagueId,
        fantasyTeamId: userTeamId,
        seasonCheerTeamId: String(seasonCheerTeamId),
      }).unwrap();
      showToast.success('Cheer Team Added', `${teamName} was added to your fantasy roster.`);
      if (onAddSuccess) onAddSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to add this cheer team.';
      showToast.error('Add Team Failed', msg);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-3">
        <View className="w-full bg-[#1e1e1e] rounded-[16px] overflow-hidden border border-[#333]">
          <View className="bg-[#0b3887] px-5 pt-5 pb-6 relative">
            <View className="flex-row justify-between items-start mb-2">
              <TouchableOpacity onPress={onClose} className="p-1 -ml-1">
                <ChevronLeft color="#fff" size={24} />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-white/20 rounded-full px-4 py-1.5 flex-row items-center border border-white/30"
                onPress={handleAddTeam}
                disabled={isAddingTeam}
                activeOpacity={0.8}
              >
                {isAddingTeam ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white text-[12px] font-bold">+ ADD</Text>
                )}
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mb-5">
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  className="w-16 h-16 rounded-full border-2 border-[#1e1e1e] mr-3 bg-white"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-full border-2 border-[#1e1e1e] mr-3 bg-[#0b3887] justify-center items-center">
                  <User color="#fff" size={28} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-white text-[22px] font-bold" numberOfLines={1}>
                  {teamName}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className="bg-[#ff2a5f] px-2 py-0.5 rounded mr-2">
                    <Text className="text-white text-[10px] font-bold">
                      CHEER
                    </Text>
                  </View>
                  <Text className="text-white text-[12px] font-medium uppercase" numberOfLines={1}>
                    {organizationName}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row justify-between mb-4 px-1">
              <View><Text className="text-[#88b0ff] text-[9px] mb-1">TYPE</Text><Text className="text-white text-[14px] font-bold">TEAM</Text></View>
              <View><Text className="text-[#88b0ff] text-[9px] mb-1">VALUE</Text><Text className="text-white text-[14px] font-bold">{selectedPlayer?.openingValue ?? selectedPlayer?.value ?? 0}</Text></View>
              <View><Text className="text-[#88b0ff] text-[9px] mb-1">DIVISIONS</Text><Text className="text-white text-[14px] font-bold">{selectedPlayer?.eligibleDivisionIds?.length ?? 0}</Text></View>
              <View><Text className="text-[#88b0ff] text-[9px] mb-1">STATUS</Text><Text className="text-white text-[14px] font-bold">Active</Text></View>
            </View>
          </View>
          <View className="p-5">
            <Text className="text-white text-[15px] font-bold mb-2">Fantasy scoring</Text>
            <Text className="text-gray-400 text-[12px] leading-5">
              This real cheer team earns fantasy points from published routine scores, deductions, placement, hit-zero, advancement, and championship bonuses. Lineups lock when its performance starts.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};


export const LockRosterModal = ({ isVisible, onClose }: any) => {
  const MEMBERS = [
    { id: '1', name: 'Diana', avatarUri: 'https://i.pravatar.cc/150?img=5' },
    { id: '2', name: 'Isabella', avatarUri: 'https://i.pravatar.cc/150?img=9' },
    { id: '3', name: 'Loris', avatarUri: 'https://i.pravatar.cc/150?img=12' },
    { id: '4', name: 'Savis', avatarUri: 'https://i.pravatar.cc/150?img=16' },
  ];

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        className="flex-1 bg-black/50 justify-center items-center px-6" 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} className="w-full bg-[#1e1e1e] rounded-[32px] border-[3px] border-white p-6 pb-6">
          <Text className="text-white text-[20px] font-medium text-center mb-6">Lock roster</Text>
          <View>
            {MEMBERS.map((member, index) => (
              <View 
                key={`${member.id}-${index}`} 
                className={`flex-row items-center justify-between py-4 ${index !== MEMBERS.length - 1 ? 'border-b border-[#333]' : 'border-b border-[#333]'}`}
              >
                <View className="flex-row items-center">
                  <Image source={{ uri: member.avatarUri }} className="w-11 h-11 rounded-full mr-4" />
                  <Text className="text-white text-[15px]">{member.name}</Text>
                </View>
                <TouchableOpacity>
                  <Unlock color="#fff" size={20} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity 
            className="bg-[#8B3DFF] rounded-full h-[52px] justify-center items-center mt-8 mx-2" 
            onPress={onClose}
          >
            <Text className="text-white text-[15px] font-medium">Save changes</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const DeleteLeagueModal = ({ isVisible, onClose, onDelete }: any) => {
  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        className="flex-1 bg-black/60 justify-center items-center px-8" 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} className="w-full bg-[#2a2a2a] rounded-[24px] border border-white/20 p-6 py-8 items-center">
          <Text className="text-white text-[16px] font-medium mb-3">Delete league</Text>
          <Text className="text-gray-300 text-[12px] text-center mb-6 leading-5 px-2">
            Are you want to sure delete league now. If you delete now your all league data will be deleted
          </Text>
          
          <View className="flex-row justify-center w-full gap-4 px-2">
            <TouchableOpacity 
              className="flex-1 h-[40px] rounded-full border border-white/40 justify-center items-center" 
              onPress={onClose}
            >
              <Text className="text-white text-[13px]">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 h-[40px] rounded-full bg-[#d33b3b] justify-center items-center" 
              onPress={onDelete}
            >
              <Text className="text-white text-[13px] font-medium">Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const JoinLeagueModal = ({
  isVisible,
  onClose,
  onJoin,
  isLoading,
  leagueName,
  errorText,
}: {
  isVisible: boolean;
  onClose: () => void;
  onJoin: (fantasyTeamName: string) => void;
  isLoading?: boolean;
  leagueName?: string;
  errorText?: string | null;
}) => {
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (isVisible) {
      setTeamName('');
    }
  }, [isVisible]);

  const handleJoin = () => {
    if (teamName.trim().length >= 3) {
      onJoin(teamName.trim());
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/80 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-[#1a1a1a] rounded-t-[32px] p-6 border-t border-[#333] w-full"
        >
          <View className="w-12 h-1 bg-gray-600 rounded-full self-center mb-6" />
          <Text className="text-white text-[20px] font-bold mb-1 text-center">Join Public League</Text>
          <Text className="text-[#E0B566] text-[13px] text-center mb-6">
            {leagueName ? `Joining "${leagueName}"` : 'Enter your team details to join'}
          </Text>

          {errorText ? (
            <View className="bg-red-900/40 border border-red-500/50 rounded-xl p-3 mb-4 flex-row items-center">
              <ShieldAlert color="#ff6b6b" size={18} className="mr-2" />
              <Text className="text-red-300 text-xs flex-1">{errorText}</Text>
            </View>
          ) : null}

          <Text className="text-gray-300 text-[13px] font-medium mb-2">Fantasy Team Name</Text>
          <View className="border border-[#8B3DFF] rounded-[16px] flex-row items-center px-4 h-[54px] mb-2 bg-[#0d0d0d]">
            <User color="#E0B566" size={20} className="mr-3" />
            <TextInput
              placeholder="e.g. Thunder Cheer Captains"
              placeholderTextColor="#666"
              className="flex-1 text-white text-[15px]"
              value={teamName}
              onChangeText={setTeamName}
              maxLength={40}
              autoCapitalize="words"
            />
          </View>
          <Text className="text-gray-500 text-[11px] mb-6">Team name must be at least 3 characters long.</Text>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="flex-1 border border-gray-600 h-[52px] rounded-full justify-center items-center"
              onPress={onClose}
              disabled={isLoading}
            >
              <Text className="text-gray-300 text-[15px] font-medium">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 h-[52px] rounded-full justify-center items-center ${
                teamName.trim().length >= 3 ? 'bg-[#8B3DFF]' : 'bg-gray-700 opacity-60'
              }`}
              onPress={handleJoin}
              disabled={teamName.trim().length < 3 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white text-[15px] font-bold">Join League</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const RosterPlayerActionModal = ({
  isVisible,
  onClose,
  selectedRosterItem,
  leagueId,
  userTeamId,
  onSuccess,
}: {
  isVisible: boolean;
  onClose: () => void;
  selectedRosterItem: any;
  leagueId: string;
  userTeamId: string;
  onSuccess?: () => void;
}) => {
  const [updateLineup, { isLoading: isUpdating }] = useUpdateFantasyCheerLineupMutation();
  const [releaseTeam, { isLoading: isDropping }] = useReleaseFantasyCheerTeamMutation();

  // selectedRosterItem is a flattened RosterPlayer from the team roster endpoint.
  const player = selectedRosterItem || {};
  const playerName = player.name || 'Cheer Team';
  const posCode = 'CHEER';
  const teamName = player.nflTeam || 'Cheer Program';
  const avatarUri = player.photoUrl;

  const isStarter = player.lineupStatus === 'starter';
  const ownershipId = player.ownershipId;

  if (!selectedRosterItem) return null;

  const handleToggleLineup = async () => {
    if (!leagueId || !userTeamId || !ownershipId) {
      showToast.error('Error', 'Missing required league or team parameters.');
      return;
    }

    const newStatus = isStarter ? 'bench' : 'starter';
    try {
      await updateLineup({
        leagueId,
        fantasyTeamId: userTeamId,
        ownershipId: String(ownershipId),
        lineupStatus: newStatus,
      }).unwrap();

      showToast.success('Lineup Updated!', `${playerName} moved to ${newStatus.toUpperCase()}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update lineup.';
      showToast.error('Lineup Error', msg);
    }
  };

  const handleConfirmDrop = () => {
    Alert.alert(
      `Drop ${playerName}?`,
      `Are you sure you want to release ${playerName}? It will return to the available cheer-team pool.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Team',
          style: 'destructive',
          onPress: async () => {
            if (!leagueId || !userTeamId || !ownershipId) {
              showToast.error('Error', 'Missing required cheer-team ownership data.');
              return;
            }
            try {
              await releaseTeam({
                leagueId,
                fantasyTeamId: userTeamId,
                ownershipId: String(ownershipId),
              }).unwrap();

              showToast.success('Team Released', `${playerName} returned to the available pool.`);
              if (onSuccess) onSuccess();
              onClose();
            } catch (err: any) {
              const msg = err?.data?.message || err?.message || 'Failed to release cheer team.';
              showToast.error('Release Error', msg);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/80 justify-center items-center px-4" activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} className="w-full bg-[#1e1e1e] rounded-[24px] border border-[#333] p-6 shadow-xl">
          {/* Header Player Info */}
          <View className="flex-row items-center mb-6 pb-4 border-b border-[#333]">
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} className="w-14 h-14 rounded-full mr-4 bg-[#333] border border-[#444]" />
            ) : (
              <View className="w-14 h-14 rounded-full mr-4 bg-[#333] border border-[#444] justify-center items-center">
                <User color="#888" size={24} />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-white text-[18px] font-bold" numberOfLines={1}>{playerName}</Text>
              <Text className="text-gray-400 text-[13px]">{`${posCode} • ${teamName}`}</Text>
              <View className="flex-row items-center mt-1.5">
                <View className={`px-2.5 py-0.5 rounded-full border ${isStarter ? 'bg-emerald-950/80 border-emerald-500/50' : 'bg-[#2b2b2b] border-[#444]'}`}>
                  <Text className={`${isStarter ? 'text-emerald-400' : 'text-gray-300'} text-[11px] font-semibold`}>
                    {isStarter ? 'STARTER' : 'BENCH'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Lineup Action Button */}
          <TouchableOpacity
            className={`h-[52px] rounded-full justify-center items-center mb-3 ${isStarter ? 'bg-[#333] border border-[#555]' : 'bg-[#8B3DFF]'}`}
            onPress={handleToggleLineup}
            disabled={isUpdating || isDropping}
            activeOpacity={0.8}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-[15px] font-bold">
                {isStarter ? 'Move to Bench' : 'Move to Starter'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Release cheer team button */}
          <TouchableOpacity
            className="h-[52px] rounded-full border border-red-500/60 bg-red-950/40 justify-center items-center mb-3"
            onPress={handleConfirmDrop}
            disabled={isUpdating || isDropping}
            activeOpacity={0.8}
          >
            {isDropping ? (
              <ActivityIndicator color="#ff6b6b" size="small" />
            ) : (
              <Text className="text-red-400 text-[15px] font-bold">Release Cheer Team</Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            className="h-[48px] rounded-full border border-gray-700 justify-center items-center"
            onPress={onClose}
            disabled={isUpdating || isDropping}
          >
            <Text className="text-gray-400 text-[14px]">Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

