import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  useGetFantasyCheerRosterQuery,
  useProposeCheerTradeMutation,
} from '../../store/api/cheerApi';
import { useGetLeagueStandingsQuery } from '../../store/api/leagueApi';
import {
  SeasonScreenHeader,
  SectionCard,
  errorMessage,
  useLeagueSeasonContext,
} from '../../components/LeagueDetail/SeasonScreenParts';
import { tradeProposalProblem } from '../../components/LeagueDetail/seasonRules';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProposeTrade'>;
type RouteProps = RouteProp<RootStackParamList, 'ProposeTrade'>;

const MAX_MESSAGE = 500;

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

export default function ProposeTradeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { leagueId, fantasyTeamId, recipientFantasyTeamId } =
    useRoute<RouteProps>().params;
  const context = useLeagueSeasonContext(leagueId);

  const [recipientId, setRecipientId] = useState<string | null>(
    recipientFantasyTeamId ?? null,
  );
  const [offered, setOffered] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const { data: standings, isLoading: teamsLoading } =
    useGetLeagueStandingsQuery(leagueId);
  const otherTeams = useMemo(
    () =>
      ((standings?.standings ?? []) as any[]).filter(
        (row) => String(row.fantasyTeamId) !== String(fantasyTeamId),
      ),
    [standings, fantasyTeamId],
  );

  const myRoster = useGetFantasyCheerRosterQuery(
    { leagueId, fantasyTeamId },
    { refetchOnMountOrArgChange: true },
  );
  const theirRoster = useGetFantasyCheerRosterQuery(
    { leagueId, fantasyTeamId: recipientId ?? '' },
    { skip: !recipientId, refetchOnMountOrArgChange: true },
  );

  const [propose, { isLoading: isSending }] = useProposeCheerTradeMutation();

  const problem = recipientId
    ? tradeProposalProblem({
        offered: offered.length,
        requested: requested.length,
        myRosterCount: myRoster.data?.rosterCount ?? 0,
        theirRosterCount: theirRoster.data?.rosterCount ?? 0,
        rosterSize: context.rosterSize,
      })
    : 'Choose a manager to trade with.';

  const chooseRecipient = (id: string) => {
    if (id === recipientId) return;
    setRecipientId(id);
    // Their picks belonged to the previous roster.
    setRequested([]);
  };

  const submit = async () => {
    if (problem || !recipientId) return;
    try {
      await propose({
        leagueId,
        fantasyTeamId,
        recipientFantasyTeamId: recipientId,
        offeredOwnershipIds: offered,
        requestedOwnershipIds: requested,
        message: message.trim() || undefined,
      }).unwrap();
      showToast.success('Trade offer sent', 'They have 2 days to answer.');
      navigation.goBack();
    } catch (err) {
      showToast.error('Could not send the offer', errorMessage(err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <SeasonScreenHeader title="Propose trade" subtitle="Swap cheer teams with another manager" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionCard label="1. Trade with">
            {teamsLoading ? (
              <ActivityIndicator color="#8B3DFF" />
            ) : otherTeams.length === 0 ? (
              <Text className="text-gray-500 text-[12px]">No other managers in this league yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {otherTeams.map((team) => {
                  const selected = String(team.fantasyTeamId) === recipientId;
                  return (
                    <TouchableOpacity
                      key={String(team.fantasyTeamId)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => chooseRecipient(String(team.fantasyTeamId))}
                      className={`mr-2 px-4 py-2.5 rounded-full border ${
                        selected ? 'bg-[#8B3DFF] border-[#8B3DFF]' : 'bg-[#181818] border-[#333]'
                      }`}
                    >
                      <Text className="text-white text-[13px] font-semibold" numberOfLines={1}>
                        {team.teamName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </SectionCard>

          <SectionCard label="2. You give">
            <RosterPicker
              query={myRoster}
              selected={offered}
              onToggle={(id) => setOffered((list) => toggle(list, id))}
              emptyText="You have no cheer teams to offer."
            />
          </SectionCard>

          <SectionCard label="3. You get">
            {!recipientId ? (
              <Text className="text-gray-500 text-[12px]">Choose a manager first.</Text>
            ) : (
              <RosterPicker
                query={theirRoster}
                selected={requested}
                onToggle={(id) => setRequested((list) => toggle(list, id))}
                emptyText="This manager has no cheer teams yet."
              />
            )}
          </SectionCard>

          <SectionCard label="Note (optional)">
            <TextInput
              value={message}
              onChangeText={(text) => setMessage(text.slice(0, MAX_MESSAGE))}
              placeholder="Add a message to your offer"
              placeholderTextColor="#666"
              multiline
              className="text-white text-[14px] min-h-[60px]"
              style={{ textAlignVertical: 'top' }}
            />
          </SectionCard>

          <Text className="text-gray-500 text-[11px] mb-6 px-1">
            {context.tradeReviewType === 'instant'
              ? 'If they accept, the teams change rosters right away.'
              : context.tradeReviewType === 'league_voting'
                ? 'If they accept, the league votes before teams move.'
                : 'If they accept, the commissioner reviews it before teams move.'}{' '}
            Teams that are locked for a competition can't be traded until they unlock.
          </Text>
        </ScrollView>

        <View className="px-5 pb-3 pt-2 border-t border-[#222] bg-black">
          {problem && recipientId ? (
            <Text className="text-gray-400 text-[12px] text-center mb-2">{problem}</Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!!problem || isSending}
            onPress={submit}
            className={`py-3.5 rounded-full items-center ${
              problem || isSending ? 'bg-[#8B3DFF]/40' : 'bg-[#8B3DFF]'
            }`}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-[15px] font-bold">
                {`Send offer${offered.length || requested.length ? ` (${offered.length} for ${requested.length})` : ''}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RosterPicker({
  query,
  selected,
  onToggle,
  emptyText,
}: {
  query: { data?: any; isLoading: boolean; isError: boolean; refetch: () => void };
  selected: string[];
  onToggle: (ownershipId: string) => void;
  emptyText: string;
}) {
  if (query.isLoading) return <ActivityIndicator color="#8B3DFF" />;
  if (query.isError) {
    return (
      <TouchableOpacity onPress={query.refetch} accessibilityRole="button">
        <Text className="text-gray-400 text-[12px]">Roster could not be loaded. Tap to retry.</Text>
      </TouchableOpacity>
    );
  }
  const teams: any[] = query.data?.teams ?? [];
  if (!teams.length) return <Text className="text-gray-500 text-[12px]">{emptyText}</Text>;

  return (
    <View>
      {teams.map((team) => {
        const isSelected = selected.includes(team.ownershipId);
        return (
          <TouchableOpacity
            key={team.ownershipId}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onToggle(team.ownershipId)}
            className={`flex-row items-center p-3 rounded-[16px] mb-2 border ${
              isSelected ? 'bg-[#8B3DFF]/20 border-[#8B3DFF]' : 'bg-[#181818] border-[#222]'
            }`}
          >
            <View
              className={`w-5 h-5 rounded-md border mr-3 items-center justify-center ${
                isSelected ? 'bg-[#8B3DFF] border-[#8B3DFF]' : 'border-[#555]'
              }`}
            >
              {isSelected ? <Check color="#fff" size={14} /> : null}
            </View>
            <View className="flex-1">
              <Text className="text-white text-[14px] font-semibold" numberOfLines={1}>
                {team.name}
              </Text>
              <Text className="text-gray-500 text-[11px]" numberOfLines={1}>
                {[team.organizationName, team.assignedDivisionCode, team.lineupStatus === 'starter' ? 'Starter' : 'Bench']
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
