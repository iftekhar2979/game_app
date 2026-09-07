import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Plus, Snowflake } from 'lucide-react-native';

import { RootStackParamList } from '../../../App';
import {
  CoinTransaction,
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
} from '../../store/api/walletApi';
import {
  amountTone,
  describeTransaction,
  formatAmount,
  formatCoinBalance,
  formatTransactionDate,
} from '../../wallet/transactionDisplay';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Wallet'>;

/**
 * The coin wallet: what the user holds, and every movement behind it.
 *
 * The balance endpoint existed and nothing called it, so a user's only view of
 * their coins was a number in the profile header with no way to see where it
 * came from. A ledger its owner cannot read is not much of a ledger.
 */
export default function WalletScreen() {
  const navigation = useNavigation<Nav>();
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const {
    data: balance,
    isLoading: isLoadingBalance,
    isError: balanceFailed,
    refetch: refetchBalance,
  } = useGetWalletBalanceQuery();

  const {
    data: statement,
    isLoading: isLoadingStatement,
    isFetching,
    isError: statementFailed,
    refetch: refetchStatement,
  } = useGetWalletTransactionsQuery(cursor ? { before: cursor } : undefined);

  const rows = statement?.data ?? [];
  const hasMore = statement?.pagination?.hasMore ?? false;

  const refresh = useCallback(() => {
    // Dropping the cursor first means a refresh returns to page one rather
    // than re-fetching whichever page the user had paged to.
    setCursor(undefined);
    refetchBalance();
    refetchStatement();
  }, [refetchBalance, refetchStatement]);

  const loadMore = useCallback(() => {
    if (isFetching || !hasMore) return;
    const next = statement?.pagination?.nextCursor;
    if (next) setCursor(next);
  }, [hasMore, isFetching, statement]);

  const renderRow = ({ item }: { item: CoinTransaction }) => {
    const tone = amountTone(item.amount);
    const toneClass =
      tone === 'credit'
        ? 'text-[#5BD98A]'
        : tone === 'debit'
        ? 'text-[#FF8A8A]'
        : 'text-gray-400';

    return (
      <View className="flex-row items-center justify-between border-b border-[#221436] py-3.5 px-5">
        <View className="flex-1 pr-3">
          <Text
            className="text-white text-[14px] font-semibold"
            numberOfLines={1}
          >
            {describeTransaction(item)}
          </Text>
          <Text className="text-gray-500 text-[11px] mt-1">
            {formatTransactionDate(item.createdAt)}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`${toneClass} text-[15px] font-bold`}>
            {formatAmount(item.amount)}
          </Text>
          <Text className="text-gray-500 text-[11px] mt-1">
            Balance {formatCoinBalance(item.balanceAfter)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-bold ml-4">Wallet</Text>
      </View>

      <View className="mx-5 rounded-[24px] border border-[#4B1E78] bg-[#1A0B2E] p-5 mb-4">
        <Text className="text-gray-400 text-[11px] uppercase font-bold tracking-wider">
          Coin balance
        </Text>
        <View className="flex-row items-center mt-2">
          <Image
            source={require('../../assets/images/utils/coins.png')}
            className="w-8 h-8 mr-2.5"
            resizeMode="contain"
          />
          {isLoadingBalance ? (
            <ActivityIndicator color="#FFB84D" />
          ) : (
            <Text className="text-[#FFB84D] text-[34px] font-extrabold">
              {formatCoinBalance(balance?.coinBalance)}
            </Text>
          )}
        </View>

        {balanceFailed ? (
          <Text className="text-[#FF8A8A] text-[12px] mt-2">
            Could not load your balance. Pull down to retry.
          </Text>
        ) : null}

        {/* A frozen wallet refuses spends server-side, so say so here rather
            than letting every purchase fail with no explanation. */}
        {balance?.isFrozen ? (
          <View
            accessibilityRole="alert"
            className="flex-row items-start rounded-xl border border-[#FF4D4D]/50 bg-[#FF4D4D]/10 p-3 mt-4"
          >
            <Snowflake color="#FF8A8A" size={16} />
            <View className="flex-1 ml-2">
              <Text className="text-[#FF8A8A] text-[12px] font-semibold">
                Wallet frozen
              </Text>
              <Text className="text-[#F3C8C8] text-[12px] leading-4 mt-0.5">
                {balance.frozenReason ||
                  'Spending is paused while this is reviewed. Contact support if this is unexpected.'}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          className="flex-row items-center justify-center bg-[#8B3DFF] rounded-full h-[48px] mt-5"
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Buy coins"
          onPress={() => navigation.navigate('CoinStore')}
        >
          <Plus color="#fff" size={18} />
          <Text className="text-white text-[15px] font-bold ml-1.5">
            Buy coins
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-white text-[15px] font-bold px-5 mb-1">
        Activity
      </Text>

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        renderItem={renderRow}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !cursor}
            onRefresh={refresh}
            tintColor="#8B3DFF"
          />
        }
        ListEmptyComponent={
          isLoadingStatement ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#8B3DFF" />
            </View>
          ) : statementFailed ? (
            <View className="items-center py-16 px-8">
              <Text className="text-gray-400 text-[13px] text-center">
                Could not load your activity. Pull down to try again.
              </Text>
            </View>
          ) : (
            <View className="items-center py-16 px-8">
              <Text className="text-white text-[15px] font-bold">
                No activity yet
              </Text>
              <Text className="text-gray-400 text-[13px] text-center mt-1.5">
                Coins you buy, spend or are given will show up here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View className="py-5 items-center">
              {isFetching ? (
                <ActivityIndicator color="#8B3DFF" />
              ) : (
                <TouchableOpacity onPress={loadMore} accessibilityRole="button">
                  <Text className="text-[#B388FF] text-[13px] font-semibold">
                    Load more
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
