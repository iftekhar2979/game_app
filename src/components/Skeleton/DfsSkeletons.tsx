import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonRegion } from './Skeleton';

/**
 * The daily fantasy screens, waiting.
 *
 * All three are built from the same two pieces: a stat read off a labelled
 * column, and a row of icon-plus-fact. Drawing them as such keeps the
 * placeholder honest about a screen that is mostly numbers - a page of plain
 * bars would suggest prose that never arrives.
 */

/** A small uppercase label with a value beneath it. */
function StatColumnSkeleton({ value = 44 }: { value?: number }) {
  return (
    <View className="flex-1">
      <Skeleton width={52} height={9} radius={4} />
      <Skeleton width={value} height={14} radius={7} style={{ marginTop: 7 }} />
    </View>
  );
}

/** An icon, a label and the fact under it. */
function FactRowSkeleton({ top = 0 }: { top?: number }) {
  return (
    <View className="flex-row items-center" style={{ marginTop: top }}>
      <Skeleton width={20} height={20} radius={6} />

      <View className="ml-3 flex-1">
        <Skeleton width="34%" height={9} radius={4} />
        <Skeleton width="58%" height={12} radius={6} style={{ marginTop: 7 }} />
      </View>
    </View>
  );
}

function ContestCardSkeleton({ long = true }: { long?: boolean }) {
  return (
    <View className="bg-[#121212] border border-[#2d2d2d] rounded-[20px] p-5 mb-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Skeleton width="100%" height={16} radius={8} />
          {/* Contest titles wrap; the placeholder has to wrap too or the real
              card shoves the list down on arrival. */}
          {long && <Skeleton width="54%" height={16} radius={8} style={{ marginTop: 6 }} />}
          <Skeleton width="38%" height={10} radius={5} style={{ marginTop: 8 }} />
        </View>

        <Skeleton width={62} height={24} radius={12} />
      </View>

      <View className="flex-row mt-4">
        <StatColumnSkeleton value={40} />
        <StatColumnSkeleton value={54} />
        <View className="justify-center">
          <Skeleton width={48} height={13} radius={6} />
        </View>
      </View>
    </View>
  );
}

/** The Daily Fantasy contest list. */
export function ContestListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion
      label="Loading contests"
      style={{ paddingHorizontal: 20, paddingTop: 4 }}
    >
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <ContestCardSkeleton key={index} long={index % 2 === 0} />
      ))}
    </SkeletonRegion>
  );
}

/** The card appended while the next page of contests loads. */
export function ContestListFooterSkeleton() {
  return (
    <SkeletonRegion label="Loading more contests" style={{ paddingTop: 4 }}>
      <ContestCardSkeleton long={false} />
    </SkeletonRegion>
  );
}

/**
 * A single contest, before its detail arrives.
 *
 * The hero, the three facts that decide whether to enter - when lineups lock,
 * how full it is, what the cap is - and the button. The button matters: it is
 * the reason the reader opened this screen, and a skeleton that stops above it
 * makes the page look shorter than it is.
 */
export function ContestDetailSkeleton() {
  return (
    <SkeletonRegion
      label="Loading contest"
      style={{ paddingHorizontal: 20, paddingTop: 4 }}
    >
      <View className="bg-[#17121f] border border-[#5b387e] rounded-[24px] p-5 mb-5">
        <Skeleton width="46%" height={10} radius={5} />
        <Skeleton width="76%" height={24} radius={12} style={{ marginTop: 10 }} />
        <Skeleton width="58%" height={12} radius={6} style={{ marginTop: 10 }} />
      </View>

      <View className="bg-[#121212] border border-[#2d2d2d] rounded-[20px] p-5 mb-4">
        <FactRowSkeleton />
        <FactRowSkeleton top={18} />
        <FactRowSkeleton top={18} />
      </View>

      <Skeleton width="100%" height={52} radius={16} />
    </SkeletonRegion>
  );
}

/**
 * The lineup builder, waiting.
 *
 * The salary bar first, then the spots. Both are load-bearing: the bar is the
 * constraint every choice on this screen is measured against, and the spots
 * are what the reader is here to fill.
 */
export function LineupSkeleton({ slots = 5 }: { slots?: number }) {
  return (
    <SkeletonRegion
      label="Getting your lineup ready"
      style={{ paddingHorizontal: 20, paddingTop: 4 }}
    >
      <View className="flex-row bg-[#17121f] border border-[#5b387e] rounded-[20px] p-4 mb-4">
        <StatColumnSkeleton value={46} />
        <StatColumnSkeleton value={62} />
        <StatColumnSkeleton value={54} />
      </View>

      <Skeleton width="34%" height={16} radius={8} style={{ marginBottom: 12 }} />

      {Array.from({ length: Math.max(1, slots) }, (_, index) => (
        <View
          key={index}
          className="bg-[#121212] border border-[#2d2d2d] rounded-[18px] p-4 mb-3 flex-row items-center"
        >
          <Skeleton width={42} height={42} radius={12} />

          <View className="ml-3 flex-1">
            <Skeleton width={index % 2 === 0 ? '52%' : '38%'} height={13} radius={6} />
            <Skeleton width="66%" height={10} radius={5} style={{ marginTop: 7 }} />
          </View>

          <Skeleton width={54} height={22} radius={11} />
        </View>
      ))}
    </SkeletonRegion>
  );
}
