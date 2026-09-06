export interface LeaveDraftRoomInput {
  status?: string | null;
  /** Whether this session ever saw the draft running. */
  sawDraftRunning: boolean;
  alreadyLeft: boolean;
}

/**
 * Whether the draft room should hand over to league play.
 *
 * Requires having seen the draft running: arriving at a room whose draft
 * finished long ago should read as history, not bounce the viewer straight
 * back out, which would also fight anyone navigating in deliberately.
 */
export const shouldLeaveDraftRoomForPlay = ({
  status,
  sawDraftRunning,
  alreadyLeft,
}: LeaveDraftRoomInput): boolean =>
  status === 'completed' && sawDraftRunning && !alreadyLeft;
