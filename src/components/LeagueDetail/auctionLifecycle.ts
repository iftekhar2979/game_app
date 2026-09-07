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
 * Whether a status means the league is genuinely in league play.
 *
 * Accepts the display label ('Play') and the server's own value ('active').
 * Nothing else qualifies - in particular `auction_active`, which is an auction
 * still running, and no locally derived value: the draft countdown used to set
 * a status of its own when it reached zero, which showed the matchup tab for a
 * league whose teams had not been bought yet. Reaching `draftStartsAt` means
 * the draft may START; only the server reports that one finished.
 */
export function isPlayModeStatus(status: unknown): boolean {
  return status === 'Play' || status === 'active';
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
