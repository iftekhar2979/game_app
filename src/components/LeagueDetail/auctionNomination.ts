/**
 * Who is on the nomination clock, and what the viewer may do about it.
 *
 * The server treats an expired nomination window as a forfeit and rolls the
 * turn on, so an expired deadline is a recoverable state rather than an error.
 * This mirrors that rule for display, so the room shows "passing to the next
 * manager" instead of a dead countdown, and the commissioner's skip button is
 * offered exactly when the server would accept it.
 */
export interface AuctionTurnView {
  /** Fantasy team id currently entitled to nominate, or null if unknown. */
  onClockTeamId: string | null;
  isMyTurn: boolean;
  /** The deadline has passed; the next nomination attempt forfeits this turn. */
  isExpired: boolean;
  /**
   * A turn is open and still taking bids. Only this blocks a new nomination -
   * a turn whose bidding has closed is settled by the server on the next
   * nomination or skip.
   */
  isBiddingLive: boolean;
  /** Whether to render the commissioner's skip control. */
  canSkip: boolean;
  /** Why skip is unavailable, for a disabled control's hint. */
  skipBlockedReason: string | null;
}

export interface AuctionTurnInput {
  auction: any;
  myTeamId?: string | null;
  isCommissioner?: boolean;
  leagueStatus?: string | null;
  now?: number;
}

export function resolveAuctionTurn({
  auction,
  myTeamId,
  isCommissioner,
  leagueStatus,
  now = Date.now(),
}: AuctionTurnInput): AuctionTurnView {
  const order: any[] = Array.isArray(auction?.nominationOrder)
    ? auction.nominationOrder
    : [];
  const index = Number(auction?.currentNominatorIndex);
  const onClockTeamId =
    order.length && Number.isInteger(index) && index >= 0 && index < order.length
      ? String(order[index])
      : null;

  const endsAt = auction?.nominationEndsAt
    ? new Date(auction.nominationEndsAt).getTime()
    : NaN;
  const isExpired = Number.isFinite(endsAt) && endsAt <= now;

  const biddingEndsAt = auction?.currentTurn?.biddingEndsAt
    ? new Date(auction.currentTurn.biddingEndsAt).getTime()
    : NaN;
  // An open turn with no readable deadline is treated as live, so a missing
  // field never lets the app cut real bidding short.
  const isBiddingLive = !!auction?.currentTurnId &&
    (!Number.isFinite(biddingEndsAt) || biddingEndsAt > now);

  // Mirrors the server's own guards on the skip endpoint, so the button is
  // never offered for a request that is certain to be refused.
  let skipBlockedReason: string | null = null;
  if (!isCommissioner) {
    skipBlockedReason = 'Only the commissioner can skip a nomination.';
  } else if (auction?.status !== 'active') {
    skipBlockedReason = 'The auction is not running.';
  } else if (leagueStatus && leagueStatus !== 'auction_active') {
    skipBlockedReason = 'The league is not in its auction phase.';
  } else if (isBiddingLive) {
    // Only live bidding blocks the skip. A turn whose bidding has closed is
    // settled by the server first, matching settleStaleTurn.
    skipBlockedReason = 'Wait for the current bidding to end.';
  } else if (!order.length) {
    skipBlockedReason = 'This auction has no nomination order.';
  }

  return {
    onClockTeamId,
    isMyTurn: !!onClockTeamId && !!myTeamId && String(myTeamId) === onClockTeamId,
    isExpired,
    isBiddingLive,
    canSkip: skipBlockedReason === null,
    skipBlockedReason,
  };
}
