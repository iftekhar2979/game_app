/**
 * Auction-league lifecycle rules for the league detail screen.
 *
 * An auction league moves registration_open -> registration_closed ->
 * auction_active -> active. `auction_active` means the auction - which IS the
 * draft - is running, and only `active` means league play. The screen used to
 * conflate the two, and separately used to invent a status of its own when the
 * draft countdown ran out, which put managers on the matchup tab of a league
 * whose teams had not been bought yet.
 *
 * These helpers are auction-only by design. Snake leagues use a different
 * status ('draft' while drafting) and are deliberately left on their existing
 * code path.
 */

/** A league drafting by auction rather than by snake/linear picks. */
export function isAuctionLeague(league: any): boolean {
  return league?.draftSettings?.type === 'auction';
}

/**
 * Whether a countdown hitting zero may put the screen into play mode.
 *
 * Never for an auction: reaching `draftStartsAt` means the auction is now
 * allowed to START, not that it finished. Only the server saying `active`
 * does that, and it says so only after every roster is full.
 *
 * Snake leagues keep the previous behaviour untouched.
 */
export function mayCountdownEndEnterPlayMode(league: any): boolean {
  return !isAuctionLeague(league);
}

/**
 * Whether a server status is an auction still in its draft phase.
 *
 * Added as an extra condition on the Draft branch of the status mapping rather
 * than by changing how any snake status is classified. `auction_active` used to
 * fall through to the Play branch, which is what put the matchup tab in front
 * of managers whose auction had only just started.
 */
export function isAuctionDraftPhaseStatus(rawStatus: unknown): boolean {
  return rawStatus === 'auction_active' || rawStatus === 'auction_scheduled';
}
