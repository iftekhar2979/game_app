import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonRegion } from './Skeleton';

/**
 * The cheer event screens, waiting.
 *
 * Event cards are unusual in this app in that the title genuinely wraps to two
 * lines - competition names are long - so the placeholder wraps too. A
 * single-line stand-in would let the real card push everything below it down
 * the moment it arrived.
 */

/** An icon and a line of text beside it, the shape both screens repeat. */
function MetaRowSkeleton({ width = '58%', top = 0 }: { width?: string; top?: number }) {
  return (
    <View className="flex-row items-center" style={{ marginTop: top }}>
      <Skeleton width={17} height={17} radius={4} />
      <Skeleton width={width} height={12} radius={6} style={{ marginLeft: 8 }} />
    </View>
  );
}

/** One card in the competition calendar. */
function EventCardSkeleton({ long = true }: { long?: boolean }) {
  return (
    <View className="bg-[#151515] border border-white/10 rounded-[22px] p-5 mb-4">
      <View className="flex-row items-start justify-between">
        <Skeleton width={44} height={44} radius={16} style={{ marginRight: 12 }} />

        <View className="flex-1">
          <Skeleton width="100%" height={16} radius={8} />
          {/* The second title line - only long names reach it. */}
          {long && <Skeleton width="62%" height={16} radius={8} style={{ marginTop: 6 }} />}
          <Skeleton width="40%" height={10} radius={5} style={{ marginTop: 8 }} />
        </View>

        <Skeleton width={58} height={22} radius={11} style={{ marginLeft: 10 }} />
      </View>

      {/* The rule and the date/location rows beneath it. */}
      <View className="mt-4 pt-4 border-t border-white/10">
        <MetaRowSkeleton width="46%" />
        <MetaRowSkeleton width="66%" top={10} />
      </View>
    </View>
  );
}

/** The competition calendar, before it loads. */
export function EventListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion
      label="Loading events"
      style={{ paddingHorizontal: 20, paddingTop: 4 }}
    >
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <EventCardSkeleton key={index} long={index % 2 === 0} />
      ))}
    </SkeletonRegion>
  );
}

/**
 * A single event, before its detail arrives.
 *
 * The hero card, the division chips and the first few entries. The chips are
 * worth drawing: they scroll horizontally, and a skeleton that omits them makes
 * a whole row appear from nowhere - the kind of shift that makes a reader lose
 * their place mid-scroll.
 */
export function EventDetailSkeleton() {
  return (
    <SkeletonRegion
      label="Loading event"
      style={{ paddingHorizontal: 20, paddingTop: 4 }}
    >
      <View className="bg-[#21190f] border border-[#E0B566]/30 rounded-[24px] p-5 mb-5">
        <Skeleton width="52%" height={10} radius={5} />
        <Skeleton width="82%" height={24} radius={12} style={{ marginTop: 10 }} />

        <View className="mt-4">
          <MetaRowSkeleton width="44%" />
          <MetaRowSkeleton width="72%" top={12} />
          <MetaRowSkeleton width="58%" top={12} />
        </View>
      </View>

      <Skeleton width="30%" height={16} radius={8} style={{ marginBottom: 12 }} />

      {/* Division chips. */}
      <View className="flex-row mb-6">
        {[112, 96, 128].map((width, index) => (
          <View
            key={index}
            className="bg-[#151515] border border-white/10 rounded-2xl px-4 py-3 mr-2"
            style={{ width }}
          >
            <Skeleton width="48%" height={12} radius={6} />
            <Skeleton width="86%" height={11} radius={5} style={{ marginTop: 6 }} />
            <Skeleton width="66%" height={9} radius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Skeleton width="42%" height={16} radius={8} />
        <Skeleton width="18%" height={10} radius={5} />
      </View>

      {[0, 1, 2].map((index) => (
        <View
          key={index}
          className="bg-[#151515] border border-white/10 rounded-2xl p-4 mb-3 flex-row items-center"
        >
          <Skeleton width={40} height={40} radius={12} />

          <View className="ml-3 flex-1">
            <Skeleton width={index % 2 === 0 ? '56%' : '42%'} height={13} radius={6} />
            <Skeleton width="70%" height={10} radius={5} style={{ marginTop: 7 }} />
          </View>
        </View>
      ))}
    </SkeletonRegion>
  );
}
