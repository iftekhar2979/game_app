import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { DraftPickRecord, DraftState } from '../../store/api/leagueApi';

const COL_WIDTH = 116;

/**
 * The draft grid: one column per team in round-one order, one row per round.
 *
 * Snake reversal is visible rather than calculated — every slot's owning team
 * comes from `draft.board`, which the server resolves. The client only looks
 * up which pick belongs in which cell.
 */
export const DraftBoard = ({
  draft,
  picks = [],
  myTeamId,
}: {
  draft: DraftState;
  picks?: DraftPickRecord[];
  myTeamId?: string;
}) => {
  const teams = draft.order || [];

  // pickNumber -> completed pick, and (round, team) -> slot, both O(1) at render.
  const { pickByNumber, slotAt } = useMemo(() => {
    const byNumber = new Map<number, DraftPickRecord>();
    picks.forEach(p => byNumber.set(p.pickNumber, p));

    const bySlot = new Map<string, number>();
    (draft.board || []).forEach(slot => {
      if (slot.fantasyTeamId) {
        bySlot.set(`${slot.round}:${slot.fantasyTeamId}`, slot.pickNumber);
      }
    });

    return { pickByNumber: byNumber, slotAt: bySlot };
  }, [picks, draft.board]);

  if (!teams.length || !draft.totalRounds) return null;

  const rounds = Array.from({ length: draft.totalRounds }, (_, i) => i + 1);

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between px-5 mb-3">
        <Text className="text-white text-[16px] font-bold">Draft Board</Text>
        <Text className="text-gray-500 text-[11px]">
          {`${picks.length} of ${draft.totalPicks} picks`}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        <View>
          {/* Team columns, in round-one order */}
          <View className="flex-row mb-1.5">
            <View className="w-9" />
            {teams.map(team => {
              const isMine =
                !!myTeamId && String(team.fantasyTeamId) === String(myTeamId);
              return (
                <View
                  key={team.fantasyTeamId}
                  style={{ width: COL_WIDTH }}
                  className="px-1"
                >
                  <Text
                    className={`text-[11px] font-bold uppercase ${
                      isMine ? 'text-[#8B3DFF]' : 'text-gray-400'
                    }`}
                    numberOfLines={1}
                  >
                    {team.name || 'Team'}
                  </Text>
                </View>
              );
            })}
          </View>

          {rounds.map(round => (
            <View key={round} className="flex-row mb-1.5">
              <View className="w-9 justify-center">
                <Text className="text-gray-600 text-[11px] font-bold">{`R${round}`}</Text>
              </View>

              {teams.map(team => {
                const pickNumber = slotAt.get(`${round}:${team.fantasyTeamId}`);
                const pick = pickNumber
                  ? pickByNumber.get(pickNumber)
                  : undefined;
                const isOnClock =
                  !!pickNumber && pickNumber === draft.currentPick;
                const isMine =
                  !!myTeamId && String(team.fantasyTeamId) === String(myTeamId);

                return (
                  <View
                    key={`${round}-${team.fantasyTeamId}`}
                    style={{ width: COL_WIDTH }}
                    className="px-1"
                  >
                    <View
                      className={`rounded-xl px-2.5 py-2 h-[54px] justify-center border ${
                        isOnClock
                          ? 'bg-[#8B3DFF]/15 border-[#8B3DFF]'
                          : pick
                          ? `bg-[#161616] ${
                              isMine
                                ? 'border-[#8B3DFF]/40'
                                : 'border-[#262626]'
                            }`
                          : 'bg-[#0d0d0d] border-[#1c1c1c]'
                      }`}
                    >
                      {pick ? (
                        <>
                          <Text
                            className="text-white text-[12px] font-semibold"
                            numberOfLines={1}
                          >
                            {pick.playerName}
                          </Text>
                          <Text
                            className="text-gray-500 text-[10px]"
                            numberOfLines={1}
                          >
                            {[
                              pick.country || pick.nflTeam,
                              pick.division || pick.positionCode,
                            ]
                              .filter(Boolean)
                              .join(' • ') || '—'}
                          </Text>
                        </>
                      ) : isOnClock ? (
                        <Text className="text-[#8B3DFF] text-[10px] font-bold uppercase">
                          On the clock
                        </Text>
                      ) : (
                        <Text className="text-gray-700 text-[11px]">
                          {pickNumber ? `Pick ${pickNumber}` : '—'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/** Reverse-chronological feed of completed picks. */
export const DraftPickFeed = ({
  picks = [],
}: {
  picks?: DraftPickRecord[];
}) => {
  if (!picks.length) return null;
  const recent = [...picks].reverse();

  return (
    <View className="px-5 mb-6">
      <Text className="text-white text-[16px] font-bold mb-3">
        Recent Picks
      </Text>
      {recent.slice(0, 12).map(pick => (
        <View
          key={pick.pickNumber}
          className="flex-row items-center border-b border-[#1c1c1c] py-2.5"
        >
          <View className="w-11">
            <Text className="text-gray-600 text-[10px] font-bold">{`R${pick.round}`}</Text>
            <Text className="text-gray-700 text-[10px]">{`#${pick.pickNumber}`}</Text>
          </View>
          <View className="flex-1">
            <Text
              className="text-white text-[13px] font-medium"
              numberOfLines={1}
            >
              {pick.playerName}
            </Text>
            <Text className="text-gray-500 text-[11px]" numberOfLines={1}>
              {[
                pick.country || pick.nflTeam,
                pick.division || pick.positionCode,
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          </View>
          <Text
            className="text-[#E0B566] text-[11px] max-w-[110px]"
            numberOfLines={1}
          >
            {pick.teamName || 'Team'}
          </Text>
        </View>
      ))}
    </View>
  );
};

/** Compact strip of what the viewer's own team has taken, for drafting to need. */
export const MyDraftedStrip = ({
  picks = [],
  myTeamId,
}: {
  picks?: DraftPickRecord[];
  myTeamId?: string;
}) => {
  const mine = useMemo(
    () =>
      myTeamId
        ? picks.filter(p => String(p.fantasyTeamId) === String(myTeamId))
        : [],
    [picks, myTeamId],
  );

  if (!myTeamId) return null;

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between px-5 mb-3">
        <Text className="text-white text-[16px] font-bold">My Picks</Text>
        <Text className="text-gray-500 text-[11px]">{`${mine.length} drafted`}</Text>
      </View>

      {mine.length === 0 ? (
        <Text className="text-gray-500 text-[12px] italic px-5">
          You have not drafted a cheer team yet.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {mine.map(pick => (
            <View
              key={pick.pickNumber}
              className="bg-[#141414] border border-[#262626] rounded-2xl px-3.5 py-2.5 mr-2.5 min-w-[128px]"
            >
              <Text
                className="text-white text-[12px] font-semibold"
                numberOfLines={1}
              >
                {pick.playerName}
              </Text>
              <Text
                className="text-gray-500 text-[10px] mt-0.5"
                numberOfLines={1}
              >
                {[
                  pick.country || pick.nflTeam,
                  pick.division || pick.positionCode,
                ]
                  .filter(Boolean)
                  .join(' • ') || '—'}
              </Text>
              <Text className="text-gray-700 text-[9px] mt-1">{`R${pick.round} · #${pick.pickNumber}`}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
