/** Calendar-based Season Long Fantasy ranks managers by total points. */
export function buildMatchupSettings() {
  return {
    format: 'total_points' as const,
    tiebreaker: 'none' as const,
  };
}
