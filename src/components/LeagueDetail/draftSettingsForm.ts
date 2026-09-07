/**
 * Why a new draft time cannot be saved, or null when it can.
 *
 * The server rejects a past time with a 400, but that rejection used to be
 * invisible: the draft settings screen is a React Native Modal, which is its
 * own native window, so a toast rendered at the app root is painted behind it.
 * Catching the case here keeps the user from ever making a request that can
 * only fail, and the inline banner covers the failures that still come back.
 *
 * Only a changed date is checked. An existing date that has since passed is
 * left alone, matching the server, so editing a pick timer on a league whose
 * draft time has elapsed is not blocked by a field the user did not touch.
 */
export function describeDraftStartsAtProblem(
  draftStartsAt: Date | null,
  originalDate: number | null,
  now: number = Date.now(),
): string | null {
  const changed = (draftStartsAt?.getTime() ?? null) !== originalDate;
  if (!changed || !draftStartsAt) return null;

  const value = draftStartsAt.getTime();
  if (!Number.isFinite(value)) return 'Pick a valid draft date and time.';
  if (value <= now) {
    return 'The draft start time must be in the future. Pick a later date and time.';
  }
  return null;
}

/**
 * Flattens whatever an RTK Query error carries into one displayable string.
 *
 * class-validator sends `message` as an array when several fields fail.
 */
export function describeSaveError(err: any): string {
  const message = err?.data?.message ?? err?.message;
  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string' && message.trim()) return message;
  return 'Failed to update draft settings.';
}
