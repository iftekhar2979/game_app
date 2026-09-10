import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonRegion } from './Skeleton';

/**
 * The league screens, waiting.
 *
 * Almost everything here is the same shape - a card with something square or
 * round on the left, a name and a line of meta beside it, and a badge on the
 * right - so it is one row built five ways rather than five near-identical
 * components that drift apart the first time a card is restyled.
 */

interface RowProps {
  /** Side of the leading square/circle. */
  leading?: number;
  /** Its corner radius; half the side gives a circle. */
  leadingRadius?: number;
  /** Width of the trailing badge, or none. */
  trailing?: number;
  /** Width of the title line, as a percentage of what is left. */
  title?: string;
  style?: StyleProp<ViewStyle>;
}

function RowCardSkeleton({
  leading = 48,
  leadingRadius = 12,
  trailing = 62,
  title = '62%',
  style,
}: RowProps) {
  return (
    <View
      className="flex-row items-center justify-between bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 mb-3"
      style={style}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <Skeleton
          width={leading}
          height={leading}
          radius={leadingRadius}
          style={{ marginRight: 12 }}
        />

        <View className="flex-1">
          <Skeleton width={title} height={14} radius={7} />
          {/* The meta line - members, visibility - is always shorter. */}
          <Skeleton width="40%" height={11} radius={5} style={{ marginTop: 8 }} />
        </View>
      </View>

      {trailing ? <Skeleton width={trailing} height={26} radius={13} /> : null}
    </View>
  );
}

/**
 * Cheer Battle Leagues, before the list arrives.
 *
 * Five rows: roughly a phone-height of list, and no more. Placeholders below
 * the fold cost animation frames nobody sees.
 */
export function LeagueListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <SkeletonRegion
      label="Loading leagues"
      style={{ paddingHorizontal: 20, paddingTop: 4 }}
    >
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        // Titles of one length read as a table; leagues have names of
        // different lengths, and the placeholder should say so.
        <RowCardSkeleton key={index} title={index % 2 === 0 ? '62%' : '46%'} />
      ))}
    </SkeletonRegion>
  );
}

/** The row appended while the next page of leagues loads. */
export function LeagueListFooterSkeleton() {
  return (
    <SkeletonRegion label="Loading more leagues" style={{ paddingTop: 4 }}>
      <RowCardSkeleton />
    </SkeletonRegion>
  );
}

/**
 * A single league, before its detail arrives.
 *
 * The info card, the membership banner and the tab strip - the three things
 * that are on this screen whatever the league turns out to be. The tab strip
 * matters most: it is the control the reader reaches for first, and a skeleton
 * that omits it makes the page appear to grow a toolbar on arrival.
 */
export function LeagueDetailSkeleton() {
  return (
    <SkeletonRegion
      label="Loading league"
      style={{ paddingHorizontal: 20, paddingTop: 4 }}
    >
      <View className="bg-[#111] border border-[#222] rounded-[24px] p-5 mb-5">
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Skeleton width={56} height={56} radius={16} style={{ marginRight: 14 }} />

            <View className="flex-1">
              <Skeleton width="70%" height={18} radius={9} />

              {/* The visibility and status badges. */}
              <View className="flex-row mt-2.5">
                <Skeleton width={62} height={20} radius={10} />
                <Skeleton width={74} height={20} radius={10} style={{ marginLeft: 8 }} />
              </View>
            </View>
          </View>

          <Skeleton width={38} height={38} radius={12} />
        </View>

        {/* The joined-teams / code footer row. */}
        <View className="flex-row items-center justify-between pt-3">
          <Skeleton width="42%" height={12} radius={6} />
          <Skeleton width="26%" height={12} radius={6} />
        </View>
      </View>

      {/* The join / already-joined banner. */}
      <Skeleton width="100%" height={72} radius={16} style={{ marginBottom: 24 }} />

      {/* The tab strip. */}
      <View className="flex-row mb-6">
        {[68, 82, 90, 62].map((width, index) => (
          <Skeleton
            key={index}
            width={width}
            height={34}
            radius={12}
            style={index === 0 ? undefined : { marginLeft: 4 }}
          />
        ))}
      </View>

      <TabPanelSkeleton />
    </SkeletonRegion>
  );
}

/**
 * The body of whichever tab is open.
 *
 * Deliberately generic. The five tabs hold quite different things - a matchup,
 * a roster, a team list - and guessing wrong would promise a layout that never
 * appears, so this says only "a panel and some rows are coming".
 */
export function TabPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      <Skeleton width="100%" height={110} radius={20} style={{ marginBottom: 16 }} />

      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <RowCardSkeleton key={index} leading={40} leadingRadius={10} trailing={48} />
      ))}
    </View>
  );
}

/**
 * The matchup tab.
 *
 * Two teams facing each other across a divider, which is the one thing every
 * matchup looks like whatever the week holds.
 */
export function MatchupTabSkeleton() {
  return (
    <SkeletonRegion label="Loading matchup" style={{ marginBottom: 24 }}>
      {/* The week selector strip. */}
      <View className="flex-row mb-4">
        {[54, 54, 54, 54].map((width, index) => (
          <Skeleton
            key={index}
            width={width}
            height={30}
            radius={10}
            style={index === 0 ? undefined : { marginLeft: 8 }}
          />
        ))}
      </View>

      <View className="bg-[#111] border border-[#222] rounded-[24px] p-5">
        <View className="items-center mb-5">
          <Skeleton width={92} height={22} radius={11} />
        </View>

        <View className="flex-row items-center justify-between">
          <MatchupSideSkeleton />
          <Skeleton width={26} height={14} radius={7} />
          <MatchupSideSkeleton />
        </View>
      </View>
    </SkeletonRegion>
  );
}

function MatchupSideSkeleton() {
  return (
    <View className="items-center flex-1">
      <SkeletonCircle size={54} />
      <Skeleton width="72%" height={12} radius={6} style={{ marginTop: 10 }} />
      <Skeleton width="46%" height={18} radius={9} style={{ marginTop: 8 }} />
    </View>
  );
}

/** The reader's own fantasy roster, inside the My Roster tab. */
export function RosterSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading your cheer teams" style={{ paddingVertical: 8 }}>
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <RowCardSkeleton
          key={index}
          leading={40}
          leadingRadius={20}
          trailing={54}
          title={index % 2 === 0 ? '58%' : '44%'}
        />
      ))}
    </SkeletonRegion>
  );
}

/** The Cheer Teams tab's list of available teams. */
export function TeamListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading available teams" style={{ paddingVertical: 8 }}>
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <RowCardSkeleton
          key={index}
          leading={44}
          leadingRadius={22}
          trailing={58}
          title={index % 2 === 0 ? '60%' : '48%'}
        />
      ))}
    </SkeletonRegion>
  );
}

/** The row appended while the next page of teams loads. */
export function TeamListFooterSkeleton() {
  return (
    <SkeletonRegion label="Loading more teams" style={{ paddingVertical: 8 }}>
      <RowCardSkeleton leading={44} leadingRadius={22} trailing={58} />
    </SkeletonRegion>
  );
}

/** Standings and matchup history, which share a row shape. */
export function StandingsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading standings">
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <View
          key={index}
          className="flex-row items-center justify-between rounded-2xl border border-[#222] bg-[#181818] p-3 mb-2"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <SkeletonCircle size={32} style={{ marginRight: 12 }} />

            <View className="flex-1">
              <Skeleton width={index % 2 === 0 ? '58%' : '44%'} height={13} radius={6} />
              <Skeleton width="38%" height={10} radius={5} style={{ marginTop: 7 }} />
            </View>
          </View>

          <View className="items-end">
            <Skeleton width={52} height={12} radius={6} />
            <Skeleton width={68} height={9} radius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </SkeletonRegion>
  );
}

/**
 * League chat, waiting.
 *
 * Alternating sides, because a column of same-side bubbles reads as a list
 * rather than as a conversation. Bubble widths vary for the same reason:
 * messages are not all one length, and a placeholder that pretends otherwise
 * looks like a table.
 */
export function LeagueChatSkeleton({ count = 6 }: { count?: number }) {
  const widths = ['64%', '46%', '78%', '38%', '58%', '70%'];

  return (
    <SkeletonRegion
      label="Loading league messages"
      style={{ paddingHorizontal: 16, paddingVertical: 18 }}
    >
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <ChatBubbleSkeleton
          key={index}
          isMine={index % 3 === 1}
          width={widths[index % widths.length]}
        />
      ))}
    </SkeletonRegion>
  );
}

/** The bubbles appended while older messages load. */
export function ChatOlderSkeleton() {
  return (
    <SkeletonRegion
      label="Loading older messages"
      style={{ paddingHorizontal: 16, paddingVertical: 12 }}
    >
      <ChatBubbleSkeleton width="52%" />
      <ChatBubbleSkeleton isMine width="40%" />
    </SkeletonRegion>
  );
}

function ChatBubbleSkeleton({
  isMine = false,
  width,
}: {
  isMine?: boolean;
  width: string;
}) {
  return (
    // The same geometry the real row uses: a 32px avatar on other people's
    // messages only, and 48px of gutter on the far side.
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 15,
        paddingRight: isMine ? 0 : 48,
        paddingLeft: isMine ? 48 : 0,
      }}
    >
      {!isMine && <SkeletonCircle size={32} style={{ marginRight: 8 }} />}

      <View style={{ flex: 1, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {!isMine && (
          <Skeleton width="34%" height={10} radius={5} style={{ marginBottom: 6 }} />
        )}
        <Skeleton width={width} height={40} radius={18} />
        <Skeleton width={34} height={8} radius={4} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}
