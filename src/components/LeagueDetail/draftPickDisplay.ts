import type { DraftPickRecord } from '../../store/api/leagueApi';

/**
 * What a draft pick took, and where it landed.
 *
 * `GET /draft/picks` serves two shapes: fantasy-cheer picks carry
 * cheerTeamName/organizationName/assignedDivision*, while legacy athlete
 * leagues carry playerName/nflTeam/positionCode. Reading only the athlete
 * fields is what rendered cheer picks as blank cards, so every read goes
 * through here and falls back across both.
 */
export const describeDraftPick = (pick: DraftPickRecord) => ({
  name: pick.cheerTeamName || pick.playerName || 'Unknown pick',
  detail:
    [
      pick.organizationName || pick.nflTeam,
      pick.assignedDivisionName || pick.assignedDivisionCode || pick.positionCode,
    ]
      .filter(Boolean)
      .join(' • ') || null,
});
