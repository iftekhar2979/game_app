/**
 * Season Long Fantasy rules the league screens need to agree on.
 *
 * Pure so they can be tested without a store. None of this is authority - the
 * server re-checks every action - it only decides what to *offer*, so a
 * manager is not shown a button the server would refuse.
 */
import type { CheerTrade, CheerTradeStatus } from '../../store/api/cheerApi';

// ============================================================================
// Season shape
// ============================================================================

/**
 * Season Long Fantasy is fixed by the server at league creation: ten regular
 * Matches ranked on total points, then Match 11 between the top four.
 */
export const REGULAR_SEASON_MATCHES = 10;
export const CHAMPIONSHIP_MATCH = 11;
export const FINALIST_COUNT = 4;

export type SeasonPhase =
  /** Matches 1-10. Finalists are only projected. */
  | 'regular'
  /** Match 10 is final: four seeds are locked, Match 11 decides it. */
  | 'championship'
  /** A champion is recorded and the league is completed. */
  | 'complete';

export interface ChampionshipSeed {
  fantasyTeamId: string;
  rank: number;
  regularSeasonTotal: number;
}

export interface SeasonStanding {
  fantasyTeamId: string;
  rank: number;
  teamName: string;
  pointsFor: number;
}

export interface SeasonSnapshot {
  phase: SeasonPhase;
  /** The Match being played now, capped at the championship. */
  currentMatch: number;
  /** Locked seeds once the regular season ends; the projected top four before. */
  finalists: ChampionshipSeed[];
  finalistsAreLocked: boolean;
  championFantasyTeamId: string | null;
}

/**
 * Where a league is in its season, from the standings response.
 *
 * The standings endpoint only includes `championshipSeeds` once all four are
 * set, which is the server's own signal that the regular season is over. Until
 * then the finalists shown are the current top four - a projection, labelled
 * as one.
 */
export function seasonSnapshot(input: {
  leagueStatus?: string | null;
  currentFantasyPeriod?: number | null;
  standings?: SeasonStanding[] | null;
  championshipSeeds?: ChampionshipSeed[] | null;
  championFantasyTeamId?: string | null;
}): SeasonSnapshot {
  const seeds = input.championshipSeeds ?? [];
  const champion = input.championFantasyTeamId ?? null;
  const finalistsAreLocked = seeds.length === FINALIST_COUNT;
  const currentMatch = Math.min(
    Math.max(input.currentFantasyPeriod ?? 1, 1),
    CHAMPIONSHIP_MATCH,
  );

  const phase: SeasonPhase =
    champion || input.leagueStatus === 'completed'
      ? 'complete'
      : finalistsAreLocked
        ? 'championship'
        : 'regular';

  const finalists = finalistsAreLocked
    ? [...seeds].sort((a, b) => a.rank - b.rank)
    : [...(input.standings ?? [])]
        .sort((a, b) => a.rank - b.rank)
        .slice(0, FINALIST_COUNT)
        .map((row) => ({
          fantasyTeamId: String(row.fantasyTeamId),
          rank: row.rank,
          regularSeasonTotal: Number(row.pointsFor ?? 0),
        }));

  return {
    phase,
    currentMatch,
    finalists,
    finalistsAreLocked,
    championFantasyTeamId: champion,
  };
}

// ============================================================================
// Trades
// ============================================================================

export type TradeReviewType = 'commissioner_veto' | 'league_voting' | 'instant';

export type TradeAction =
  | 'accept'
  | 'reject'
  | 'cancel'
  | 'approve'
  | 'veto'
  | 'voteApprove'
  | 'voteVeto';

export interface TradeViewer {
  myFantasyTeamId?: string | null;
  isCommissioner: boolean;
  reviewType: TradeReviewType;
  now?: Date;
}

/**
 * What this viewer may do with one trade, mirroring the server's checks:
 *
 * - The recipient answers a `proposed` offer before it expires; the proposer
 *   may withdraw it until then.
 * - An `accepted` trade waits for review. The commissioner decides it in a
 *   commissioner-veto league; in a voting league every manager gets one vote.
 */
export function tradeActionsFor(
  trade: Pick<
    CheerTrade,
    | 'status'
    | 'expiresAt'
    | 'proposerFantasyTeamId'
    | 'recipientFantasyTeamId'
    | 'viewerHasVoted'
  >,
  viewer: TradeViewer,
): TradeAction[] {
  const mine = viewer.myFantasyTeamId ? String(viewer.myFantasyTeamId) : null;
  const isProposer = !!mine && String(trade.proposerFantasyTeamId) === mine;
  const isRecipient = !!mine && String(trade.recipientFantasyTeamId) === mine;
  const now = viewer.now ?? new Date();

  if (trade.status === 'proposed') {
    if (new Date(trade.expiresAt) <= now) return [];
    if (isRecipient) return ['accept', 'reject'];
    if (isProposer) return ['cancel'];
    return [];
  }

  if (trade.status === 'accepted') {
    if (viewer.reviewType === 'commissioner_veto' && viewer.isCommissioner) {
      return ['approve', 'veto'];
    }
    // The server counts a majority of *every* active team and lets the two
    // parties vote too, so hiding the buttons from them could leave a small
    // league unable to reach one.
    if (
      viewer.reviewType === 'league_voting' &&
      mine &&
      !trade.viewerHasVoted
    ) {
      return ['voteApprove', 'voteVeto'];
    }
  }

  return [];
}

export type TradeTone = 'pending' | 'success' | 'muted' | 'danger';

/** A short status label, and how loudly to show it. */
export function describeTradeStatus(
  status: CheerTradeStatus,
  reviewType: TradeReviewType,
): { label: string; tone: TradeTone } {
  switch (status) {
    case 'proposed':
      return { label: 'Awaiting reply', tone: 'pending' };
    case 'accepted':
      return {
        label:
          reviewType === 'league_voting'
            ? 'League vote'
            : 'Commissioner review',
        tone: 'pending',
      };
    case 'completed':
      return { label: 'Completed', tone: 'success' };
    case 'rejected':
      return { label: 'Declined', tone: 'danger' };
    case 'vetoed':
      return { label: 'Vetoed', tone: 'danger' };
    case 'cancelled':
      return { label: 'Withdrawn', tone: 'muted' };
    case 'expired':
      return { label: 'Expired', tone: 'muted' };
    default:
      return { label: String(status), tone: 'muted' };
  }
}

/** Which list a trade belongs in, from this manager's side. */
export function tradeBucket(
  trade: Pick<
    CheerTrade,
    'status' | 'proposerFantasyTeamId' | 'recipientFantasyTeamId'
  >,
  myFantasyTeamId?: string | null,
): 'action' | 'open' | 'history' {
  const open = trade.status === 'proposed' || trade.status === 'accepted';
  if (!open) return 'history';
  const mine = myFantasyTeamId ? String(myFantasyTeamId) : null;
  if (
    trade.status === 'proposed' &&
    mine &&
    String(trade.recipientFantasyTeamId) === mine
  ) {
    return 'action';
  }
  return 'open';
}

/**
 * A trade proposal the server would accept on shape alone: at least one team
 * each way, at most ten, and neither roster pushed past its limit.
 */
export function tradeProposalProblem(input: {
  offered: number;
  requested: number;
  myRosterCount: number;
  theirRosterCount: number;
  rosterSize: number;
}): string | null {
  if (input.offered < 1) return 'Pick at least one of your teams to offer.';
  if (input.requested < 1) return 'Pick at least one team to ask for.';
  if (input.offered > 10 || input.requested > 10) {
    return 'A trade can include at most ten teams each way.';
  }
  const mineAfter = input.myRosterCount - input.offered + input.requested;
  const theirsAfter = input.theirRosterCount - input.requested + input.offered;
  if (mineAfter > input.rosterSize) {
    return `Your roster would exceed ${input.rosterSize} teams.`;
  }
  if (theirsAfter > input.rosterSize) {
    return `Their roster would exceed ${input.rosterSize} teams.`;
  }
  return null;
}

// ============================================================================
// Waivers
// ============================================================================

export type WaiverType = 'faab' | 'waiver_priority' | 'none';

/** What a waiver claim needs beyond the team itself, or why it cannot be made. */
export function waiverClaimProblem(input: {
  waiverType: WaiverType;
  bidAmount: number;
  faabBalance: number;
  rosterCount: number;
  rosterSize: number;
  hasDrop: boolean;
  hasDivision: boolean;
}): string | null {
  if (input.waiverType === 'none') return 'Waivers are off in this league.';
  if (!input.hasDivision) return 'Choose the division this team will fill.';
  if (input.rosterCount >= input.rosterSize && !input.hasDrop) {
    return 'Your roster is full. Choose a team to drop.';
  }
  if (input.waiverType === 'faab') {
    if (!Number.isFinite(input.bidAmount) || input.bidAmount < 0) {
      return 'Enter a bid of 0 or more.';
    }
    if (input.bidAmount > input.faabBalance) {
      return `You have ${input.faabBalance} FAAB to bid.`;
    }
  }
  return null;
}
