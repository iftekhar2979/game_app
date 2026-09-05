import React from 'react';
import { Text, View } from 'react-native';
import {
  DIVISION_WIN_BONUSES,
  GRAND_CHAMPION_BONUS,
  HIT_ZERO_BONUS,
  LAST_PLACE_PENALTIES,
  SCORE_BANDS,
} from '../../utils/cheerScoring';

/**
 * The one fixed Fantasy Cheer scoring system.
 *
 * Every value on this screen is read straight from `utils/cheerScoring` -
 * the same constants `calculateCheerFantasyPoints` uses. There is no league,
 * season or server override: if a number here is wrong, it is wrong for the
 * whole system and is fixed in one place.
 */
/** "+50 pts" / "-20 pts" - sign is always explicit so nothing is ambiguous. */
const signedPoints = (points: number) =>
  `${points > 0 ? '+' : ''}${points} pts`;

/** Describes a "other teams in the division" tier the way the rules read. */
const otherTeamsLabel = (minimum: number, maximum: number | null) => {
  if (maximum === null) return `${minimum} or more other teams`;
  if (minimum === maximum) return `${minimum} other team`;
  return `${minimum}-${maximum} other teams`;
};

const ScoringRow = ({
  label,
  points,
  isLast = false,
}: {
  label: string;
  points: number;
  isLast?: boolean;
}) => (
  <View
    className={`flex-row items-center justify-between px-4 py-3 ${
      isLast ? '' : 'border-b border-[#222]'
    }`}
  >
    <Text className="text-gray-300 text-[13px] flex-1 mr-3">{label}</Text>
    <Text
      className={`text-[14px] font-bold ${
        points < 0 ? 'text-[#FF6B6B]' : 'text-[#4CAF50]'
      }`}
    >
      {signedPoints(points)}
    </Text>
  </View>
);

const ScoringSection = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <View className="mb-6">
    <Text className="text-white text-[15px] font-bold mb-1">{title}</Text>
    {!!subtitle && (
      <Text className="text-gray-500 text-[11px] mb-2.5">{subtitle}</Text>
    )}
    <View className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
      {children}
    </View>
  </View>
);

/**
 * The one fixed scoring system, rendered straight from the constants in
 * `utils/cheerScoring` - the same values `calculateCheerFantasyPoints` uses.
 * Deliberately not fetched: every league and every team scores identically,
 * so there is nothing per-league to load and nothing that can drift out of
 * sync with what the calculator actually does.
 */
/**
 * The rules themselves, with no surrounding framing, so the league tab and the
 * admin dashboard can present them in their own context without duplicating a
 * single value.
 */
export const FixedScoringRulesList = () => {
  const positiveBands = SCORE_BANDS.filter(band => band.points > 0);
  const negativeBands = SCORE_BANDS.filter(band => band.points < 0);

  const bandLabel = (band: { minimum: number; maximum: number }) =>
    band.minimum === 0
      ? `Scored below ${band.maximum}`
      : `Scored ${band.minimum}-${band.maximum}`;

  return (
    <View>
      <ScoringSection
        title="Official score"
        subtitle="A score landing on a boundary earns the higher band."
      >
        {positiveBands.map((band, index) => (
          <ScoringRow
            key={`band-${band.minimum}`}
            label={bandLabel(band)}
            points={band.points}
            isLast={index === positiveBands.length - 1}
          />
        ))}
      </ScoringSection>

      <ScoringSection title="Bonuses">
        {DIVISION_WIN_BONUSES.map(bonus => (
          <ScoringRow
            key={`win-${bonus.minimumOtherTeams}`}
            label={`Winning division with ${otherTeamsLabel(
              bonus.minimumOtherTeams,
              bonus.maximumOtherTeams,
            )}`}
            points={bonus.points}
          />
        ))}
        <ScoringRow label="Hit zero deductions" points={HIT_ZERO_BONUS} />
        <ScoringRow
          label="Grand champion"
          points={GRAND_CHAMPION_BONUS}
          isLast
        />
      </ScoringSection>

      <ScoringSection
        title="Deductions"
        subtitle="Applied the same way for every team."
      >
        {negativeBands.map(band => (
          <ScoringRow
            key={`negative-${band.minimum}`}
            label={bandLabel(band)}
            points={band.points}
          />
        ))}
        {LAST_PLACE_PENALTIES.map((penalty, index) => (
          <ScoringRow
            key={`last-${penalty.minimumOtherTeams}`}
            label={`Finishing last in a division with ${otherTeamsLabel(
              penalty.minimumOtherTeams,
              penalty.maximumOtherTeams,
            )}`}
            points={penalty.points}
            isLast={index === LAST_PLACE_PENALTIES.length - 1}
          />
        ))}
      </ScoringSection>
    </View>
  );
};

/**
 * League-detail presentation: the same rules, introduced for a manager who
 * is looking at one league.
 */
export const ScoringRulesTab = () => (
  <View className="mb-4 mt-2">
    <View className="bg-[#2B2112] border border-[#E0B566]/30 rounded-2xl p-4 mb-6">
      <Text className="text-[#E0B566] text-[11px] font-bold uppercase tracking-wider">
        Standard scoring
      </Text>
      <Text className="text-white font-semibold mt-1">
        One system for every team
      </Text>
      <Text className="text-gray-400 text-[12px] leading-5 mt-1">
        These rules are the same in every league and every season. A team
        earns points for its official score, then bonuses and deductions are
        applied on top.
      </Text>
    </View>
    <FixedScoringRulesList />
  </View>
);
