import { useMemo } from 'react';
import {
  useGetLeagueMatchScoresQuery,
  useGetLeagueStandingsQuery,
} from '../../store/api/leagueApi';
import {
  CHAMPIONSHIP_MATCH,
  type SeasonStanding,
  seasonSnapshot,
} from './seasonRules';

export interface FinalistRow {
  fantasyTeamId: string;
  seed: number;
  teamName: string;
  managerName: string | null;
  regularSeasonTotal: number;
  /** Match 11 points. Null before the championship has scores. */
  championshipPoints: number | null;
  isMe: boolean;
  isChampion: boolean;
}

/**
 * Standings, season phase and the championship table for one league.
 *
 * Match 11's scores are only asked for once the seeds are locked: before that
 * there is nothing to show, and a season that has not configured Match 11 yet
 * would answer with a 404 for no reason.
 */
export function useSeasonStandings(
  leagueId: string,
  league: any,
  myFantasyTeamId?: string | null,
) {
  const standingsQuery = useGetLeagueStandingsQuery(leagueId, {
    skip: !leagueId,
    refetchOnMountOrArgChange: true,
  });
  const data: any = standingsQuery.data;
  const standings: SeasonStanding[] = data?.standings ?? [];

  const snapshot = seasonSnapshot({
    leagueStatus: league?.status,
    currentFantasyPeriod: data?.currentFantasyPeriod ?? league?.currentFantasyPeriod,
    standings,
    championshipSeeds: data?.championshipSeeds,
    championFantasyTeamId:
      data?.championFantasyTeamId ?? league?.championFantasyTeamId ?? null,
  });

  const championshipQuery = useGetLeagueMatchScoresQuery(
    { leagueId, matchNumber: CHAMPIONSHIP_MATCH },
    { skip: !leagueId || !snapshot.finalistsAreLocked },
  );

  const finalists: FinalistRow[] = useMemo(() => {
    const entries = new Map(
      (championshipQuery.data?.entries ?? []).map((entry) => [
        String(entry.fantasyTeamId),
        entry,
      ]),
    );
    const names = new Map(
      standings.map((row) => [String(row.fantasyTeamId), row.teamName]),
    );
    const rows = snapshot.finalists.map((seed) => {
      const id = String(seed.fantasyTeamId);
      const entry = entries.get(id);
      return {
        fantasyTeamId: id,
        seed: seed.rank,
        teamName: names.get(id) ?? entry?.displayName ?? 'Fantasy team',
        managerName: entry?.displayName ?? null,
        regularSeasonTotal: seed.regularSeasonTotal,
        championshipPoints:
          snapshot.finalistsAreLocked && entry ? entry.points : null,
        isMe:
          !!myFantasyTeamId && id === String(myFantasyTeamId),
        isChampion: snapshot.championFantasyTeamId === id,
      };
    });

    // Once the final has scores, order by them with the server's own
    // tiebreakers: regular-season total, then seed.
    if (rows.some((row) => row.championshipPoints !== null)) {
      rows.sort(
        (a, b) =>
          (b.championshipPoints ?? 0) - (a.championshipPoints ?? 0) ||
          b.regularSeasonTotal - a.regularSeasonTotal ||
          a.seed - b.seed,
      );
    }
    return rows;
  }, [championshipQuery.data, standings, snapshot, myFantasyTeamId]);

  return {
    standingsQuery,
    championshipQuery,
    standings,
    snapshot,
    finalists,
    teamName: (id?: string | null) =>
      standings.find((row) => String(row.fantasyTeamId) === String(id))
        ?.teamName ?? null,
  };
}
