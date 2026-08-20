import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ThumbsUp } from 'lucide-react-native';
import {
  REACTION_EMOJI,
  REACTION_TYPES,
  ReactionCounts,
  ReactionType,
  totalReactions,
} from '../../store/api/socialApi';

interface ReactionBarProps {
  counts: ReactionCounts;
  myReaction: ReactionType | null;
  onReact: (type: ReactionType) => void;
  /** Compact variant used inside comment threads. */
  compact?: boolean;
}

/**
 * Facebook-style reaction control: tap for a quick "like", long-press to open
 * the full picker. Tapping the reaction already held removes it, which mirrors
 * the server's toggle contract exactly.
 */
export const ReactionBar = ({ counts, myReaction, onReact, compact }: ReactionBarProps) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const total = totalReactions(counts);

  const handleReact = (type: ReactionType) => {
    setIsPickerOpen(false);
    onReact(type);
  };

  // Only the reaction types that anyone actually used, most popular first.
  const present = REACTION_TYPES.filter((type) => (counts?.[type] || 0) > 0)
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    .slice(0, 3);

  return (
    <View className="relative flex-row items-center">
      <TouchableOpacity
        onPress={() => handleReact(myReaction ?? 'like')}
        onLongPress={() => setIsPickerOpen((open) => !open)}
        delayLongPress={250}
        activeOpacity={0.7}
        className="flex-row items-center"
        accessibilityLabel={
          myReaction ? `Remove your ${myReaction} reaction` : 'Like this post'
        }
        accessibilityRole="button"
      >
        {myReaction ? (
          <Text style={{ fontSize: compact ? 14 : 18 }} className="mr-1.5">
            {REACTION_EMOJI[myReaction]}
          </Text>
        ) : (
          <ThumbsUp color="#999" size={compact ? 14 : 18} style={{ marginRight: 6 }} />
        )}

        {present.length > 0 && (
          <View className="flex-row mr-2">
            {present.map((type, index) => (
              <View
                key={type}
                className="w-[22px] h-[22px] rounded-full bg-white justify-center items-center border-[1.5px] border-[#0a0a0a]"
                style={{ marginLeft: index === 0 ? 0 : -6, zIndex: present.length - index }}
              >
                <Text style={{ fontSize: 12 }}>{REACTION_EMOJI[type]}</Text>
              </View>
            ))}
          </View>
        )}

        <Text className={`text-white ${compact ? 'text-[12px]' : 'text-[14px]'}`}>{total}</Text>
      </TouchableOpacity>

      {isPickerOpen && (
        <View
          className="absolute bottom-8 left-0 flex-row bg-white rounded-[20px] p-2 z-50"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          {REACTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => handleReact(type)}
              accessibilityLabel={`React with ${type}`}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 24 }} className="mx-1">
                {REACTION_EMOJI[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};
