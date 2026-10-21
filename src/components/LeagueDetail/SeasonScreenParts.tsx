import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useGetLeagueDetailsQuery } from '../../store/api/leagueApi';
import type { TradeReviewType, WaiverType } from './seasonRules';

/**
 * The league settings the season screens act on.
 *
 * Read from the league-detail query the League screen has already loaded, so
 * opening one of these screens is normally a cache hit. Defaults mirror the
 * server's schema defaults, which is what a league created without the field
 * actually runs on.
 */
export function useLeagueSeasonContext(leagueId: string) {
  const query = useGetLeagueDetailsQuery(leagueId, { skip: !leagueId });
  const payload: any = query.data;
  const league: any = payload?.league ?? payload;
  const caller: any = payload?.caller;

  return {
    ...query,
    league,
    isCommissioner: !!caller?.isCreator,
    leagueStatus: (league?.status as string | undefined) ?? null,
    rosterSize: Number(league?.fantasyCheerSettings?.rosterSize ?? 6),
    waiverType: (league?.waiverSettings?.type ?? 'faab') as WaiverType,
    waiverClearingDays: Number(league?.waiverSettings?.waiverClearingDays ?? 2),
    allowTrades: league?.tradeSettings?.allowTrades ?? true,
    tradeDeadline: (league?.tradeSettings?.tradeDeadline as string | undefined) ?? null,
    tradeReviewType: (league?.tradeSettings?.reviewType ??
      'commissioner_veto') as TradeReviewType,
  };
}

/** The back-button header every league sub-screen uses. */
export function SeasonScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const navigation = useNavigation();
  return (
    <View className="flex-row items-center px-5 pt-2.5 pb-4 border-b border-[#222]">
      <TouchableOpacity
        className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <ChevronLeft color="#fff" size={24} />
      </TouchableOpacity>
      <View className="flex-1">
        <Text className="text-white text-[20px] font-bold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-gray-400 text-[12px]" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function CenteredLoading({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#8B3DFF" />
      <Text className="text-gray-400 text-[13px] mt-3">{label}</Text>
    </View>
  );
}

export function CenteredError({
  title,
  error,
  fallback,
  onRetry,
}: {
  title: string;
  error?: unknown;
  fallback: string;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-white text-[15px] font-semibold mb-2">{title}</Text>
      <Text className="text-gray-400 text-[12px] text-center mb-4">
        {errorMessage(error) || fallback}
      </Text>
      <TouchableOpacity
        className="bg-[#8B3DFF] px-5 py-2.5 rounded-full"
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text className="text-white text-[13px] font-medium">Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

/** A card section with the uppercase label the roster screen uses. */
export function SectionCard({
  label,
  children,
  className = '',
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`bg-[#111] border border-[#222] rounded-[24px] p-4 mb-4 ${className}`}
    >
      {label ? (
        <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-3">
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** The server's message for a failed request, when it sent one. */
export function errorMessage(error: unknown): string | undefined {
  const err: any = error;
  const message = err?.data?.message ?? err?.message;
  if (Array.isArray(message)) return message.join('\n');
  return typeof message === 'string' ? message : undefined;
}
