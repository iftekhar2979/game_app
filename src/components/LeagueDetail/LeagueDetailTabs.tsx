import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, TextInput, Share } from 'react-native';
import { Repeat, Plus, Users, UserCheck, Shield, Globe, Lock, Award, Settings, ChevronRight, Search, X, User } from 'lucide-react-native';



import { useGetCurrentMatchupQuery, useGetLeagueStandingsQuery, useGetMatchupHistoryQuery } from '../../store/api/leagueApi';
import { ActivityIndicator } from 'react-native';
import { RosterSections } from './RosterPlayerRow';
import { formatFantasyPoints, formatGameStatus, formatMatchupScore } from './matchupDisplay';

export const MatchupTab = ({ leagueId, league, selectedWeek, setSelectedWeek }: any) => {
  const isTotalPointsLeague =
    league?.matchupSettings?.format === 'total_points';
  const defaultWeekStr = `Week ${league?.currentWeek || 1}`;
  const [localWeek, setLocalWeek] = useState<string | null>(null);
  const [isWeekModalVisible, setIsWeekModalVisible] = useState(false);
  const weeks = Array.from({ length: 18 }, (_, i) => `Week ${i + 1}`);

  const activeWeekStr = selectedWeek || localWeek || defaultWeekStr;
  const selectedWeekNum = parseInt(activeWeekStr.replace('Week ', ''), 10) || (league?.currentWeek || 1);

  const changeWeek = (week: string) => {
    if (setSelectedWeek) {
      setSelectedWeek(week);
    } else {
      setLocalWeek(week);
    }
    setIsWeekModalVisible(false);
  };

  const { currentData: matchupData, isLoading, isFetching, isError, refetch } = useGetCurrentMatchupQuery(
    { leagueId, week: selectedWeekNum },
    { skip: !leagueId || leagueId.startsWith('mock-') },
  );

  if ((isLoading || isFetching) && !matchupData) {
    return (
      <View className="py-12 items-center justify-center">
        <ActivityIndicator size="large" color="#8B3DFF" />
        <Text className="text-gray-400 text-[13px] mt-3">Loading matchup...</Text>
      </View>
    );
  }

  // A total-points league never schedules opponents, so an absent matchup is
  // the expected state rather than a failure.
  if (isTotalPointsLeague) {
    return (
      <View className="bg-[#1e1e1e] border border-[#333] rounded-[24px] p-6 mb-6 items-center justify-center">
        <Text className="text-white text-[15px] font-semibold mb-2">Season Total Points</Text>
        <Text className="text-gray-400 text-[12px] text-center">
          This league has no weekly opponents. Your team scores as its athletes compete at
          events — check the League tab for the standings.
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="bg-[#1e1e1e] border border-[#333] rounded-[24px] p-6 mb-6 items-center justify-center">
        <Text className="text-white text-[15px] font-semibold mb-2">Unable to Load Matchup</Text>
        <Text className="text-gray-400 text-[12px] text-center mb-4">
          Could not connect to the server. Please check your connection and try again.
        </Text>
        <TouchableOpacity className="bg-[#8B3DFF] px-5 py-2.5 rounded-full" onPress={() => refetch()}>
          <Text className="text-white text-[13px] font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!matchupData) {
    return (
      <View className="bg-[#1e1e1e] border border-[#333] rounded-[24px] p-6 mb-6 items-center justify-center">
        <Text className="text-white text-[15px] font-semibold mb-2">No Matchup Scheduled</Text>
        <Text className="text-gray-400 text-[12px] text-center mb-4">
          No matchup has been generated or scheduled for this week yet.
        </Text>
        <TouchableOpacity
          className="bg-[#8B3DFF] px-5 py-2.5 rounded-full"
          onPress={() => refetch()}
        >
          <Text className="text-white text-[13px] font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { myTeam, opponent, result } = matchupData;

  const resultColor =
    result?.status === 'winning'
      ? 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10'
      : result?.status === 'losing'
      ? 'text-rose-400 border-rose-400/40 bg-rose-400/10'
      : 'text-amber-400 border-amber-400/40 bg-amber-400/10';

  return (
    <View className="mb-4 mt-2">
      {/* Matchups Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Text className="text-white text-[18px] font-semibold mr-2">{activeWeekStr}</Text>
          <View className={`px-2.5 py-0.5 rounded-full border ${resultColor}`}>
            <Text className="text-[10px] font-bold uppercase">{formatGameStatus(result?.status)}</Text>
          </View>
        </View>

        <TouchableOpacity 
          className="flex-row items-center p-2"
          onPress={() => setIsWeekModalVisible(true)}
        >
          <Text className="text-gray-400 text-[12px] mr-2">{activeWeekStr}</Text>
          <Repeat color="#999" size={14} />
        </TouchableOpacity>
      </View>

      {/* Matchup Overview Card */}
      <View className="border border-[#E0B566] rounded-[24px] mb-6 p-1 relative overflow-hidden bg-[#0d0d0d]">
        <View className="flex-row">
          {/* Left Team (My Team) */}
          <View className="flex-1 border border-[#222] rounded-[20px] bg-[#141414] p-4 mr-0.5 items-center">
            {myTeam?.avatarUri ? (
              <Image source={{ uri: myTeam.avatarUri }} className="w-12 h-12 rounded-full mb-2 bg-[#222]" />
            ) : (
              <View className="w-12 h-12 rounded-full border border-[#8B3DFF] justify-center items-center bg-[#8B3DFF]/20 mb-2">
                <Text className="text-[#8B3DFF] text-[10px] font-bold">MY</Text>
              </View>
            )}
            <Text className="text-[#E0B566] text-[11px] font-medium mb-1 uppercase tracking-wider">My Team</Text>
            <Text className="text-white text-[14px] font-bold text-center mb-2" numberOfLines={1}>
              {myTeam?.teamName || 'My Team'}
            </Text>
            
            <Text className="text-[#8B3DFF] text-[22px] font-extrabold">{formatMatchupScore(myTeam?.score)}</Text>
            <Text className="text-gray-500 text-[9px] uppercase font-bold">Points</Text>
          </View>

          {/* Right Team (Opponent) */}
          <View className="flex-1 border border-[#222] rounded-[20px] bg-[#141414] p-4 ml-0.5 items-center">
            {opponent?.avatarUri ? (
              <Image source={{ uri: opponent.avatarUri }} className="w-12 h-12 rounded-full mb-2 bg-[#222]" />
            ) : (
              <View className="w-12 h-12 rounded-full border border-gray-600 justify-center items-center bg-gray-800 mb-2">
                <Text className="text-gray-300 text-[10px] font-bold">OPP</Text>
              </View>
            )}
            <Text className="text-gray-400 text-[11px] font-medium mb-1 uppercase tracking-wider">Opponent</Text>
            <Text className="text-white text-[14px] font-bold text-center mb-2" numberOfLines={1}>
              {opponent?.teamName || 'Opponent'}
            </Text>
            
            <Text className="text-gray-200 text-[22px] font-extrabold">{formatMatchupScore(opponent?.score)}</Text>
            <Text className="text-gray-500 text-[9px] uppercase font-bold">Points</Text>
          </View>
        </View>

        {/* VS Badge */}
        <View className="absolute top-[40%] left-1/2 w-9 h-9 bg-[#E0B566] rounded-full justify-center items-center -ml-4.5 z-10 shadow-md">
          <Text className="text-black text-[12px] font-extrabold">VS</Text>
        </View>
      </View>

      {/* MY STARTERS SECTION */}
      <View className="mb-6">
        <Text className="text-white text-[16px] font-bold mb-3">
          MY STARTERS <Text className="text-gray-500 text-[13px]">({myTeam?.teamName})</Text>
        </Text>
        <View className="bg-[#121212] border border-[#222] rounded-[20px] p-3">
          {myTeam?.starters?.length > 0 ? (
            myTeam.starters.map((starter: any, idx: number) => (
              <View key={`${starter.seasonAthleteId || 'starter'}-${idx}`} className="flex-row items-center justify-between border-b border-[#222] py-2.5 last:border-b-0 px-1">
                <View className="flex-row items-center flex-1">
                  <Image source={{ uri: starter.photoUrl || 'https://i.pravatar.cc/150?img=11' }} className="w-9 h-9 rounded-full bg-[#222] mr-3" />
                  <View className="flex-1">
                    <Text className="text-white text-[13px] font-semibold" numberOfLines={1}>{starter.name}</Text>
                    <Text className="text-gray-400 text-[10px]">{starter.nflTeam} • {starter.assignedPosition || starter.positionCode}</Text>
                  </View>
                </View>
                <View className="items-end ml-2">
                  <Text className="text-[#E0B566] text-[13px] font-bold">{formatFantasyPoints(starter.fantasyPoints)}</Text>
                  <Text className="text-gray-500 text-[9px] uppercase">{formatGameStatus(starter.gameStatus)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-gray-500 text-[12px] p-2 text-center">No starters assigned yet.</Text>
          )}
        </View>
      </View>

      {/* OPPONENT STARTERS SECTION */}
      <View className="mb-6">
        <Text className="text-white text-[16px] font-bold mb-3">
          OPPONENT STARTERS <Text className="text-gray-500 text-[13px]">({opponent?.teamName})</Text>
        </Text>
        <View className="bg-[#121212] border border-[#222] rounded-[20px] p-3">
          {opponent?.starters?.length > 0 ? (
            opponent.starters.map((starter: any, idx: number) => (
              <View key={`${starter.seasonAthleteId || 'opp-starter'}-${idx}`} className="flex-row items-center justify-between border-b border-[#222] py-2.5 last:border-b-0 px-1">
                <View className="flex-row items-center flex-1">
                  <Image source={{ uri: starter.photoUrl || 'https://i.pravatar.cc/150?img=12' }} className="w-9 h-9 rounded-full bg-[#222] mr-3" />
                  <View className="flex-1">
                    <Text className="text-white text-[13px] font-semibold" numberOfLines={1}>{starter.name}</Text>
                    <Text className="text-gray-400 text-[10px]">{starter.nflTeam} • {starter.assignedPosition || starter.positionCode}</Text>
                  </View>
                </View>
                <View className="items-end ml-2">
                  <Text className="text-gray-300 text-[13px] font-bold">{formatFantasyPoints(starter.fantasyPoints)}</Text>
                  <Text className="text-gray-500 text-[9px] uppercase">{formatGameStatus(starter.gameStatus)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-gray-500 text-[12px] p-2 text-center">No starters assigned yet.</Text>
          )}
        </View>
      </View>

      {/* Week Selection Modal */}
      <Modal
        visible={isWeekModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsWeekModalVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 justify-center items-center bg-black/80 px-6"
          activeOpacity={1}
          onPress={() => setIsWeekModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            className="w-full bg-[#1e1e1e] rounded-[32px] border-2 border-white p-6 pt-8 items-center shadow-lg shadow-black"
          >
            <View className="flex-row flex-wrap justify-between w-full">
              {weeks.map((week, index) => (
                <TouchableOpacity
                  key={index}
                  className={`w-[31%] border ${activeWeekStr === week ? 'border-[#FFB84D] bg-[#FFB84D]/10' : 'border-gray-400'} rounded-[12px] py-2 mb-4 justify-center items-center`}
                  onPress={() => {
                    changeWeek(week);
                  }}
                >
                  <Text className={`${activeWeekStr === week ? 'text-[#FFB84D] font-bold' : 'text-white'} text-[13px]`}>{week}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const DraftTab = ({ isDraftStarted, timeLeft, league, navigation }: any) => {
  const joinUrl = `https://cheerbattle.com/leagues/join/${league?.code || league?.id || ''}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;

  const draftTimeFormatted = (() => {
    const rawDate =
      league?.draftStartsAt ||
      league?.settings?.draftSettings?.draftStartsAt ||
      league?.draftDate;

    if (!rawDate) return 'Draft time to be scheduled';
    try {
      const d = new Date(rawDate);
      return `${d.toDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return 'Draft scheduled';
    }
  })();

  return (
    <View>
      {/* Draftboard Card */}
      {!isDraftStarted ? (
        <View className="bg-[#FFB84D] rounded-[24px] p-5 mb-8">
          <Text className="text-black text-center text-[16px] font-medium mb-1">Draftboard</Text>
          <Text className="text-black text-center text-[12px] opacity-80 mb-6">
            {draftTimeFormatted}
          </Text>

          {/* Countdown */}
          {timeLeft ? (
            <View className="flex-row justify-center items-center mb-6">
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.days).padStart(2, '0')}</Text>
                <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Day</Text>
                <Text className="text-black text-[18px] font-bold mr-2">:</Text>
              </View>
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.hours).padStart(2, '0')}</Text>
                <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Hours</Text>
                <Text className="text-black text-[18px] font-bold mr-2">:</Text>
              </View>
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.minutes).padStart(2, '0')}</Text>
                <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Min</Text>
                <Text className="text-black text-[18px] font-bold mr-2">:</Text>
              </View>
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.seconds).padStart(2, '0')}</Text>
                <Text className="text-black text-[10px] mt-1 opacity-80">sec</Text>
              </View>
            </View>
          ) : (
            <View className="flex-row justify-center items-center mb-6 h-[40px]">
              <Text className="text-black text-[16px] font-bold opacity-70">00 : 00 : 00 : 00</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-[#8B3DFF] rounded-full h-[50px] justify-center items-center mx-8"
            activeOpacity={0.9}
            onPress={() => navigation.navigate('DraftRoom', { leagueId: league?.id })}
          >
            <Text className="text-white text-[16px] font-medium">Draftroom</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-[#8B3DFF] rounded-[24px] p-6 mb-8 justify-center items-center border border-[#B366FF]">
          <Text className="text-white text-center text-[22px] font-bold mb-2">Game Started!</Text>
          <Text className="text-white/80 text-center text-[14px] mb-6">The draft has begun. Join your league now.</Text>
          <TouchableOpacity
            className="bg-white rounded-full h-[50px] justify-center items-center px-8 w-[80%]"
            activeOpacity={0.9}
            onPress={() => navigation.navigate('DraftRoom', { leagueId: league?.id })}
          >
            <Text className="text-[#8B3DFF] text-[16px] font-bold">Go to Draft Room</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Share / Invite Section */}
      <View className="bg-[#111] border border-[#222] rounded-[24px] p-5 mb-8">
        <Text className="text-white text-[16px] font-bold mb-1">Invite League Members</Text>
        <Text className="text-gray-400 text-[12px] mb-4">Share this 6-digit code or QR code with friends to join.</Text>

        {/* 6-Digit Join Code Box */}
        <View className="bg-[#181818] border border-[#333] rounded-2xl p-4 mb-4">
          <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 text-center">
            Private League Join Code
          </Text>
          <View className="flex-row items-center justify-center mb-3">
            <Text className="text-[#FFB84D] text-[28px] font-black tracking-[6px] text-center">
              {league?.code || league?.joinCode || '------'}
            </Text>
          </View>
          <View className="flex-row justify-center">
            <TouchableOpacity
              className="bg-[#FFB84D] px-6 py-2.5 rounded-xl flex-row items-center justify-center"
              activeOpacity={0.8}
              onPress={async () => {
                const codeToShare = league?.code || league?.joinCode || league?.id || '';
                try {
                  await Share.share({
                    message: `Join my private Cheer Fantasy League on CheerBattle! Use join code: ${codeToShare}\nOr join directly: https://cheerbattle.com/leagues/join/${codeToShare}`,
                  });
                } catch (e) {}
              }}
            >
              <Text className="text-black text-[13px] font-bold">Share Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center justify-center mb-4 bg-white p-3 rounded-2xl self-center">
          <Image source={{ uri: qrCodeUrl }} className="w-36 h-36" />
        </View>

        <View className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex-row items-center justify-between">
          <Text className="text-[#E0B566] text-[12px] font-mono flex-1 mr-2" numberOfLines={1}>
            {joinUrl}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const TeamTab = ({
  teamSlots: propTeamSlots = [],
  setSelectedSlotIndex: parentSetSelectedSlotIndex,
  setIsAddTeamModalVisible: parentSetIsAddTeamModalVisible,
  isMember = false,
  onOpenJoinModal,
  maxTeams: propMaxTeams = 12,
  myRoster,
  isMyRosterLoading = false,
  totalRosterSize,
  onSelectRosterPlayer,
  onSelectTeam,
}: any) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [isAddTeamModalVisible, setIsAddTeamModalVisible] = useState(false);

  const handleSetSelectedSlot = parentSetSelectedSlotIndex || setSelectedSlotIndex;
  const handleSetAddModal = parentSetIsAddTeamModalVisible || setIsAddTeamModalVisible;

  const slots = Array.isArray(propTeamSlots) ? propTeamSlots : [];
  const filledCount = slots.filter((t: any) => t !== null && t !== undefined).length;
  const maxTeams = propMaxTeams || 12;

  const starters = myRoster?.starters || [];
  const bench = myRoster?.bench || [];
  const rosterCount = myRoster?.rosterCount ?? 0;

  return (
    <View className="mb-4 mt-2">
      {/* My fantasy team roster */}
      {isMember && (
        <View className="bg-[#111] border border-[#222] rounded-[24px] p-4 mb-6">
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-[#222]">
            <View className="flex-row items-center">
              <Shield color="#8B3DFF" size={20} className="mr-2.5" />
              <Text className="text-white text-[17px] font-bold" numberOfLines={1}>
                {myRoster?.team?.name || 'MY FANTASY TEAM'}
              </Text>
            </View>
            <View className="bg-[#1e1a2b] border border-[#8B3DFF]/50 px-3 py-1 rounded-full">
              <Text className="text-[#8B3DFF] text-[12px] font-bold">
                {`Roster: ${rosterCount} / ${totalRosterSize ?? '—'}`}
              </Text>
            </View>
          </View>

          {isMyRosterLoading && !myRoster ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" color="#8B3DFF" />
              <Text className="text-gray-400 text-[12px] mt-2">Loading your cheer teams...</Text>
            </View>
          ) : !myRoster ? (
            <Text className="text-gray-500 text-[12px] italic">
              Your roster is unavailable right now. Pull to refresh or try again shortly.
            </Text>
          ) : rosterCount === 0 ? (
            <Text className="text-gray-500 text-[12px] italic">
              You have not acquired any cheer teams yet. Teams you draft or add appear here.
            </Text>
          ) : (
            <RosterSections starters={starters} bench={bench} onSelectPlayer={onSelectRosterPlayer} />
          )}
        </View>
      )}

      {/* Header Summary */}
      <View className="flex-row items-center justify-between mb-4 bg-[#111] p-4 rounded-2xl border border-[#222]">
        <View className="flex-row items-center">
          <Users color="#E0B566" size={20} className="mr-3" />
          <View>
            <Text className="text-white text-[15px] font-semibold">League Teams</Text>
            <Text className="text-gray-400 text-[12px]">{`${filledCount} / ${maxTeams} Teams Filled`}</Text>
          </View>
        </View>

        {!isMember && onOpenJoinModal ? (
          <TouchableOpacity
            className="bg-[#8B3DFF] px-4 py-2 rounded-full flex-row items-center"
            activeOpacity={0.8}
            onPress={onOpenJoinModal}
          >
            <Plus color="#fff" size={16} className="mr-1" />
            <Text className="text-white text-[13px] font-bold">Join League</Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-full flex-row items-center">
            <UserCheck color="#34d399" size={14} className="mr-1.5" />
            <Text className="text-emerald-400 text-[12px] font-medium">Joined</Text>
          </View>
        )}
      </View>

      {/* Slots */}
      {slots.map((team: any, index: number) => {
        if (team) {
          const canOpenRoster = !!(team.teamId && onSelectTeam);
          return (
            <TouchableOpacity
              key={`slot-${index}`}
              className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4"
              activeOpacity={canOpenRoster ? 0.7 : 1}
              disabled={!canOpenRoster}
              onPress={() => onSelectTeam(team.teamId, team.name)}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4 overflow-hidden">
                  {team.avatarUri ? (
                    <Image source={{ uri: team.avatarUri }} className="w-full h-full" />
                  ) : (
                    <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-white text-[15px] font-semibold mb-0.5" numberOfLines={1}>{team.name}</Text>
                  <Text className="text-[#E0B566] text-[13px]">{team.handle || `@team${index + 1}`}</Text>
                  {canOpenRoster && (
                    <Text className="text-gray-500 text-[11px] mt-0.5">Tap to view manager and cheer roster</Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="bg-[#222] border border-[#333] px-3 py-1 rounded-full">
                  <Text className="text-gray-300 text-[11px] font-medium">{team.role || (index === 0 ? 'Commissioner' : 'Joined')}</Text>
                </View>
                {canOpenRoster && <ChevronRight color="#666" size={16} />}
              </View>
            </TouchableOpacity>
          );
        } else {
          return (
            <TouchableOpacity
              key={`slot-${index}`}
              className="flex-row items-center border-b border-[#222] pb-4 mb-4"
              activeOpacity={0.7}
              onPress={() => {
                if (!isMember && onOpenJoinModal) {
                  onOpenJoinModal();
                } else {
                  handleSetSelectedSlot(index);
                  handleSetAddModal(true);
                }
              }}
            >
              <View className="w-12 h-12 rounded-full border border-dashed border-gray-600 justify-center items-center bg-[#0a0a0a] mr-4">
                <Text className="text-gray-500 text-[15px] font-medium">{index + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-[15px] font-medium">Empty Team Slot</Text>
                <Text className="text-gray-600 text-[12px]">
                  {!isMember ? 'Tap to join with your team' : 'Tap to add team'}
                </Text>
              </View>
              <View className="border border-[#8B3DFF]/60 bg-[#8B3DFF]/10 px-3 py-1.5 rounded-full flex-row items-center">
                <Plus color="#8B3DFF" size={14} className="mr-1" />
                <Text className="text-[#8B3DFF] text-[12px] font-bold">
                  {!isMember ? 'Join' : 'Add'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }
      })}
    </View>
  );
};


export const PlayersTab = ({
  players = [],
  positions = [],
  searchTerm,
  onChangeSearchTerm,
  selectedPositionId,
  onSelectPosition,
  isLoading = false,
  isFetching = false,
  hasMore = false,
  totalItems = 0,
  onLoadMore,
  onSelectPlayer,
}: any) => {
  return (
    <View className="mb-4 mt-2">
      {/* Search */}
      <View className="flex-row items-center bg-[#111] border border-[#222] rounded-2xl px-3.5 py-2.5 mb-3">
        <Search color="#666" size={16} />
        <TextInput
          className="flex-1 text-white text-[14px] ml-2.5 p-0"
          placeholder="Search cheer teams"
          placeholderTextColor="#666"
          value={searchTerm}
          onChangeText={onChangeSearchTerm}
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!searchTerm && (
          <TouchableOpacity onPress={() => onChangeSearchTerm('')} hitSlop={8}>
            <X color="#666" size={16} />
          </TouchableOpacity>
        )}
      </View>

      {/* Position filters */}
      {positions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <TouchableOpacity
            className={`rounded-full px-4 py-1.5 mr-2.5 border ${
              !selectedPositionId ? 'border-[#FFB84D] bg-[#FFB84D]/10' : 'border-[#333]'
            }`}
            onPress={() => onSelectPosition(null)}
            activeOpacity={0.7}
          >
            <Text className={`${!selectedPositionId ? 'text-[#FFB84D]' : 'text-gray-400'} text-[12px] font-medium`}>
              All
            </Text>
          </TouchableOpacity>
          {positions.map((pos: any) => {
            const isSelected = String(selectedPositionId) === String(pos._id);
            return (
              <TouchableOpacity
                key={pos._id}
                className={`rounded-full px-4 py-1.5 mr-2.5 border ${
                  isSelected ? 'border-[#FFB84D] bg-[#FFB84D]/10' : 'border-[#333]'
                }`}
                onPress={() => onSelectPosition(isSelected ? null : pos._id)}
                activeOpacity={0.7}
              >
                <Text className={`${isSelected ? 'text-[#FFB84D]' : 'text-gray-400'} text-[12px] font-medium`}>
                  {pos.code || pos.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {isLoading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#8B3DFF" />
          <Text className="text-gray-400 text-[13px] mt-3">Loading cheer teams...</Text>
        </View>
      ) : players.length === 0 ? (
        <View className="py-12 items-center justify-center px-6">
          <Text className="text-white text-[15px] font-semibold mb-1.5">No cheer teams available</Text>
          <Text className="text-gray-400 text-[12px] text-center">
            {searchTerm || selectedPositionId
              ? 'No free agents match this search. Try clearing the filters.'
              : 'Eligible season cheer teams appear here until another manager acquires them.'}
          </Text>
        </View>
      ) : (
        <>
          <Text className="text-gray-500 text-[11px] mb-3">
            {`Showing ${players.length}${totalItems ? ` of ${totalItems}` : ''} available cheer teams`}
          </Text>

          {players.map((player: any, index: number) => (
            <TouchableOpacity
              key={`${player.id}-${index}`}
              className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4"
              activeOpacity={0.7}
              onPress={() => onSelectPlayer && onSelectPlayer(player)}
            >
              <View className="flex-row items-center flex-1">
                {player.avatarUri ? (
                  <Image source={{ uri: player.avatarUri }} className="w-11 h-11 rounded-full mr-4 bg-[#333]" />
                ) : (
                  <View className="w-11 h-11 rounded-full mr-4 bg-[#222] border border-[#333] justify-center items-center">
                    <User color="#666" size={18} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-white text-[15px] mb-1" numberOfLines={1}>{player.name}</Text>
                  <Text className="text-gray-400 text-[12px]">{player.subtitle}</Text>
                </View>
              </View>

              {player.value !== null && player.value !== undefined && (
                <View className="items-end justify-center ml-3">
                  <Text className="text-[#FFB84D] text-[14px] font-semibold">{`$${player.value}`}</Text>
                  <Text className="text-gray-600 text-[9px] uppercase font-bold">Value</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {hasMore && (
            <TouchableOpacity
              className="border border-[#333] rounded-full py-3 items-center mb-4"
              onPress={onLoadMore}
              disabled={isFetching}
              activeOpacity={0.7}
            >
              {isFetching ? (
                <ActivityIndicator size="small" color="#8B3DFF" />
              ) : (
                <Text className="text-gray-300 text-[13px] font-medium">Load more</Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

export const LeagueTab = ({ leagueId, userTeamId, league }: any) => {
  const { data: standingsData, isLoading: isStandingsLoading } = useGetLeagueStandingsQuery(leagueId, {
    skip: !leagueId || leagueId.startsWith('mock-'),
  });

  const { data: historyData, isLoading: isHistoryLoading } = useGetMatchupHistoryQuery(leagueId, {
    skip: !leagueId || leagueId.startsWith('mock-'),
  });

  const standingsList = standingsData?.standings || [];
  const historyList = historyData?.matchups || [];
  // Cheer leagues accumulate points across events; head-to-head records are
  // meaningless there, so the server tells us how it ranks.
  const isTotalPoints = standingsData?.format === 'total_points';

  return (
    <View className="mb-4 mt-2">
      {/* Detailed Rules & Settings Card */}
      <View className="bg-[#111] border border-[#222] rounded-[24px] p-5 mb-6">
        <View className="flex-row items-center mb-4 pb-3 border-b border-[#222]">
          <Settings color="#E0B566" size={20} className="mr-3" />
          <Text className="text-white text-[16px] font-bold">League Overview & Rules</Text>
        </View>

        <View className="space-y-3">
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">League Type</Text>
            <Text className="text-[#E0B566] text-[13px] font-bold uppercase">{league?.visibility || 'Public'}</Text>
          </View>

          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">Total Team Capacity</Text>
            <Text className="text-white text-[13px] font-medium">{league?.maxTeams || 12} Teams Max</Text>
          </View>

          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">Draft Type</Text>
            <Text className="text-white text-[13px] font-medium capitalize">
              {`${league?.draftSettings?.type || 'Auction'} draft`}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">Scoring Format</Text>
            <Text className="text-[#8B3DFF] text-[13px] font-semibold">
              {isTotalPoints ? 'Season total points' : 'Head-to-head'}
            </Text>
          </View>

          {league?.description ? (
            <View className="mt-3 pt-3 border-t border-[#222]">
              <Text className="text-gray-400 text-[12px] font-medium mb-1">About League</Text>
              <Text className="text-gray-300 text-[13px] leading-5">{league.description}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Standings Section */}
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-[18px] font-bold">League Standings</Text>
          {isStandingsLoading && <ActivityIndicator size="small" color="#8B3DFF" />}
        </View>

        <View className="bg-[#111] border border-[#222] rounded-[20px] p-3">
          {standingsList.length > 0 ? (
            standingsList.map((item: any, idx: number) => {
              const isMyTeam = String(item.fantasyTeamId) === String(userTeamId);
              return (
                <View
                  key={`${item.fantasyTeamId || item.rank || 'team'}-${idx}`}
                  className={`flex-row items-center justify-between p-3 rounded-[16px] mb-2 border ${
                    isMyTeam ? 'bg-[#8B3DFF]/20 border-[#8B3DFF]' : 'bg-[#181818] border-[#222]'
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-full bg-[#222] border border-[#444] items-center justify-center mr-3">
                      <Text className="text-[#E0B566] text-[12px] font-bold">#{item.rank}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-[14px] font-bold ${isMyTeam ? 'text-[#E0B566]' : 'text-white'}`} numberOfLines={1}>
                        {item.teamName} {isMyTeam ? '(My Team)' : ''}
                      </Text>
                      <Text className="text-gray-400 text-[11px]">
                        {isTotalPoints
                          ? `${item.pointsFor ?? 0} pts this season`
                          : `W ${item.wins} • L ${item.losses} • T ${item.ties}`}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-white text-[13px] font-bold">PF: {item.pointsFor}</Text>
                    <Text className="text-gray-400 text-[10px]">PA: {item.pointsAgainst} • {(item.winPercentage * 100).toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-gray-500 text-[12px] p-3 text-center">No standings available yet.</Text>
          )}
        </View>
      </View>

      {/* Matchup History Section */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-[18px] font-bold">Matchup History</Text>
          {isHistoryLoading && <ActivityIndicator size="small" color="#8B3DFF" />}
        </View>

        <View className="bg-[#111] border border-[#222] rounded-[20px] p-3">
          {historyList.length > 0 ? (
            historyList.map((matchup: any, idx: number) => {
              const resultColor =
                matchup.result === 'WIN'
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/40'
                  : matchup.result === 'LOSS'
                  ? 'text-rose-400 bg-rose-400/10 border-rose-400/40'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/40';

              return (
                <View key={`${matchup.matchupId || 'matchup'}-${idx}`} className="flex-row items-center justify-between border-b border-[#222] py-3 last:border-b-0 px-1">
                  <View className="flex-1">
                    <Text className="text-[#E0B566] text-[11px] font-bold uppercase mb-0.5">Week {matchup.weekNumber}</Text>
                    <Text className="text-white text-[14px] font-semibold">vs {matchup.opponentTeamName}</Text>
                  </View>

                  <View className="items-end mr-3">
                    <Text className="text-white text-[14px] font-bold">{matchup.myScore} - {matchup.opponentScore}</Text>
                    <Text className="text-gray-500 text-[9px] uppercase">{matchup.status}</Text>
                  </View>

                  <View className={`px-3 py-1 rounded-full border ${resultColor}`}>
                    <Text className="text-[11px] font-extrabold">{matchup.result}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-gray-500 text-[12px] p-3 text-center">No completed matchups yet.</Text>
          )}
        </View>
      </View>
    </View>
  );
};

