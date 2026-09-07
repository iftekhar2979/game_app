/**
 * When the league's draft is scheduled to begin.
 *
 * The API sends this at `draftSettings.draftStartsAt` - it is a subdocument on
 * the league (see league.schema.ts) and the endpoint returns the league object
 * spread, so there is no top-level `draftStartsAt` and no `settings` wrapper.
 * Three call sites each hand-rolled the lookup and none of them tried that
 * path, so the countdown never had a target and sat at 00:00:00 forever while
 * the server was refusing to start a draft that was still in the future.
 *
 * The older shapes are kept as fallbacks: mock leagues carry `draftDate`, and a
 * league object already mapped by the detail screen carries a flattened
 * `draftStartsAt`.
 */
export function resolveDraftStartsAt(league: any): string | Date | undefined {
  return (
    league?.draftSettings?.draftStartsAt ||
    league?.draftStartsAt ||
    league?.settings?.draftSettings?.draftStartsAt ||
    league?.draftDate ||
    undefined
  );
}

/**
 * The same value as a timestamp, or null when there is nothing to count to.
 *
 * A malformed date resolves to null rather than NaN, so a countdown cannot
 * render "NaN" or silently behave as though the deadline had passed.
 */
export function resolveDraftStartsAtTime(league: any): number | null {
  const raw = resolveDraftStartsAt(league);
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}
