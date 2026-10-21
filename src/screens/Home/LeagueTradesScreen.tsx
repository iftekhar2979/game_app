import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftRight, Plus } from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  type CheerTrade,
  useCancelCheerTradeMutation,
  useGetCheerTradesQuery,
  useResolveCheerTradeMutation,
  useRespondToCheerTradeMutation,
  useVoteOnCheerTradeMutation,
} from '../../store/api/cheerApi';
import {
  CenteredError,
  CenteredLoading,
  SeasonScreenHeader,
  SectionCard,
  errorMessage,
  useLeagueSeasonContext,
} from '../../components/LeagueDetail/SeasonScreenParts';
import {
  type TradeAction,
  type TradeTone,
  describeTradeStatus,
  tradeActionsFor,
  tradeBucket,
} from '../../components/LeagueDetail/seasonRules';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LeagueTrades'>;
type RouteProps = RouteProp<RootStackParamList, 'LeagueTrades'>;

const TONE_CLASS: Record<TradeTone, { box: string; text: string }> = {
  pending: { box: 'bg-[#2a2210] border-[#E0B566]/50', text: 'text-[#E0B566]' },
  success: { box: 'bg-[#10291a] border-[#3ccf7a]/50', text: 'text-[#3ccf7a]' },
  danger: { box: 'bg-[#2b1111] border-[#ff6b6b]/50', text: 'text-[#ff8a8a]' },
  muted: { box: 'bg-[#1a1a1a] border-[#333]', text: 'text-gray-400' },
};

const ACTION_LABEL: Record<TradeAction, string> = {
  accept: 'Accept',
  reject: 'Decline',
  cancel: 'Withdraw',
  approve: 'Approve',
  veto: 'Veto',
  voteApprove: 'Vote approve',
  voteVeto: 'Vote veto',
};

/** Actions that undo or refuse something get the quiet button. */
const SECONDARY: TradeAction[] = ['reject', 'cancel', 'veto', 'voteVeto'];

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : '';

export default function LeagueTradesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { leagueId, fantasyTeamId } = useRoute<RouteProps>().params;
  const context = useLeagueSeasonContext(leagueId);

  const { data: trades = [], isLoading, isFetching, isError, error, refetch } =
    useGetCheerTradesQuery(leagueId, { refetchOnMountOrArgChange: true });

  const [respond] = useRespondToCheerTradeMutation();
  const [cancel] = useCancelCheerTradeMutation();
  const [resolve] = useResolveCheerTradeMutation();
  const [vote] = useVoteOnCheerTradeMutation();
  const [busy, setBusy] = useState<string | null>(null);

  const viewer = {
    myFantasyTeamId: fantasyTeamId,
    isCommissioner: context.isCommissioner,
    reviewType: context.tradeReviewType,
  };

  const grouped = useMemo(() => {
    const groups = { action: [] as CheerTrade[], open: [] as CheerTrade[], history: [] as CheerTrade[] };
    for (const trade of trades) groups[tradeBucket(trade, fantasyTeamId)].push(trade);
    return groups;
  }, [trades, fantasyTeamId]);

  const deadlinePassed =
    !!context.tradeDeadline && new Date(context.tradeDeadline) <= new Date();
  const canPropose =
    !!fantasyTeamId &&
    context.allowTrades &&
    !deadlinePassed &&
    context.leagueStatus === 'active';

  const run = async (trade: CheerTrade, action: TradeAction) => {
    const args = { leagueId, tradeId: trade._id };
    setBusy(`${trade._id}:${action}`);
    try {
      if (action === 'accept' || action === 'reject') {
        await respond({ ...args, accept: action === 'accept' }).unwrap();
      } else if (action === 'cancel') {
        await cancel(args).unwrap();
      } else if (action === 'approve' || action === 'veto') {
        await resolve({ ...args, approve: action === 'approve' }).unwrap();
      } else {
        await vote({ ...args, approve: action === 'voteApprove' }).unwrap();
      }
      showToast.success('Trade updated', ACTION_DONE[action]);
    } catch (err) {
      showToast.error('Could not update the trade', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const confirmThen = (trade: CheerTrade, action: TradeAction) => {
    // Accepting may move teams immediately, so it is the one worth a pause.
    if (action !== 'accept' && action !== 'approve') return run(trade, action);
    Alert.alert(
      action === 'accept' ? 'Accept this trade?' : 'Approve this trade?',
      context.tradeReviewType === 'instant' || action === 'approve'
        ? 'The cheer teams will change rosters right away.'
        : 'The trade then goes to league review before teams move.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: ACTION_LABEL[action], onPress: () => void run(trade, action) },
      ],
    );
  };

  const subtitle = !context.allowTrades
    ? 'Trades are off in this league'
    : context.tradeDeadline
      ? `${deadlinePassed ? 'Deadline passed' : 'Deadline'} ${formatDate(context.tradeDeadline)}`
      : 'No trade deadline';

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <SeasonScreenHeader
        title="Trades"
        subtitle={subtitle}
        right={
          canPropose ? (
            <TouchableOpacity
              className="flex-row items-center bg-[#8B3DFF] px-3.5 py-2 rounded-full"
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('ProposeTrade', {
                  leagueId,
                  fantasyTeamId: fantasyTeamId!,
                })
              }
            >
              <Plus color="#fff" size={16} />
              <Text className="text-white text-[13px] font-semibold ml-1">Propose</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading ? (
        <CenteredLoading label="Loading trades..." />
      ) : isError ? (
        <CenteredError
          title="Trades unavailable"
          error={error}
          fallback="The league's trades could not be loaded."
          onRetry={refetch}
        />
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#8B3DFF" />
          }
        >
          {trades.length === 0 ? (
            <View className="items-center py-16 px-6">
              <ArrowLeftRight color="#555" size={36} />
              <Text className="text-white text-[15px] font-semibold mt-4">No trades yet</Text>
              <Text className="text-gray-500 text-[12px] text-center mt-1">
                {canPropose
                  ? 'Swap cheer teams with another manager to strengthen your roster.'
                  : 'Trades made in this league will show up here.'}
              </Text>
            </View>
          ) : null}

          {(
            [
              ['action', 'Needs your answer'],
              ['open', 'In progress'],
              ['history', 'History'],
            ] as const
          ).map(([bucket, label]) =>
            grouped[bucket].length ? (
              <View key={bucket} className="mb-2">
                <Text className="text-white text-[16px] font-bold mb-3">{label}</Text>
                {grouped[bucket].map((trade) => (
                  <TradeCard
                    key={trade._id}
                    trade={trade}
                    myFantasyTeamId={fantasyTeamId}
                    reviewType={context.tradeReviewType}
                    actions={tradeActionsFor(trade, viewer)}
                    busy={busy}
                    onAction={(action) => confirmThen(trade, action)}
                  />
                ))}
              </View>
            ) : null,
          )}
          <View className="h-10" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const ACTION_DONE: Record<TradeAction, string> = {
  accept: 'You accepted the offer.',
  reject: 'You declined the offer.',
  cancel: 'Your offer was withdrawn.',
  approve: 'The trade was approved.',
  veto: 'The trade was vetoed.',
  voteApprove: 'Your vote to approve was counted.',
  voteVeto: 'Your vote to veto was counted.',
};

function TradeCard({
  trade,
  myFantasyTeamId,
  reviewType,
  actions,
  busy,
  onAction,
}: {
  trade: CheerTrade;
  myFantasyTeamId?: string;
  reviewType: Parameters<typeof describeTradeStatus>[1];
  actions: TradeAction[];
  busy: string | null;
  onAction: (action: TradeAction) => void;
}) {
  const status = describeTradeStatus(trade.status, reviewType);
  const tone = TONE_CLASS[status.tone];
  const isMine = (id: string) => !!myFantasyTeamId && String(id) === String(myFantasyTeamId);

  return (
    <SectionCard>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-500 text-[11px]">{formatDate(trade.createdAt)}</Text>
        <View className={`px-2.5 py-0.5 rounded-full border ${tone.box}`}>
          <Text className={`text-[10px] font-bold uppercase ${tone.text}`}>{status.label}</Text>
        </View>
      </View>

      <TradeSide
        teamName={trade.proposer.name}
        isMine={isMine(trade.proposer.fantasyTeamId)}
        verb="gives"
        assets={trade.offered}
      />
      <View className="items-center my-1.5">
        <ArrowLeftRight color="#8B3DFF" size={16} />
      </View>
      <TradeSide
        teamName={trade.recipient.name}
        isMine={isMine(trade.recipient.fantasyTeamId)}
        verb="gives"
        assets={trade.requested}
      />

      {trade.message ? (
        <Text className="text-gray-300 text-[12px] italic mt-3">“{trade.message}”</Text>
      ) : null}

      {trade.status === 'accepted' && reviewType === 'league_voting' ? (
        <Text className="text-gray-400 text-[11px] mt-3">
          {`${trade.approvals} approve • ${trade.vetoes} veto${
            trade.viewerHasVoted ? ' • You voted' : ''
          }`}
        </Text>
      ) : null}
      {trade.status === 'proposed' ? (
        <Text className="text-gray-500 text-[11px] mt-3">
          {`Offer expires ${new Date(trade.expiresAt).toLocaleString()}`}
        </Text>
      ) : null}

      {actions.length ? (
        <View className="flex-row mt-4">
          {actions.map((action, index) => {
            const isBusy = busy === `${trade._id}:${action}`;
            const secondary = SECONDARY.includes(action);
            return (
              <TouchableOpacity
                key={action}
                disabled={!!busy}
                accessibilityRole="button"
                onPress={() => onAction(action)}
                className={`flex-1 py-2.5 rounded-full items-center border ${
                  index > 0 ? 'ml-2' : ''
                } ${secondary ? 'border-[#444] bg-transparent' : 'border-[#8B3DFF] bg-[#8B3DFF]'} ${
                  busy && !isBusy ? 'opacity-50' : ''
                }`}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className={`text-[13px] font-semibold ${secondary ? 'text-gray-200' : 'text-white'}`}>
                    {ACTION_LABEL[action]}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </SectionCard>
  );
}

function TradeSide({
  teamName,
  isMine,
  verb,
  assets,
}: {
  teamName: string;
  isMine: boolean;
  verb: string;
  assets: CheerTrade['offered'];
}) {
  return (
    <View className={`rounded-[16px] p-3 border ${isMine ? 'bg-[#8B3DFF]/15 border-[#8B3DFF]/60' : 'bg-[#181818] border-[#222]'}`}>
      <Text className="text-gray-400 text-[11px] mb-1.5">
        <Text className={`font-bold ${isMine ? 'text-[#E0B566]' : 'text-white'}`}>
          {isMine ? 'You' : teamName}
        </Text>
        {` ${verb}`}
      </Text>
      {assets.map((asset) => (
        <Text key={asset.ownershipId} className="text-white text-[13px] font-medium" numberOfLines={1}>
          {`• ${asset.name}`}
        </Text>
      ))}
    </View>
  );
}
