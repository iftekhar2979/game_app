import type { DraftPickRecord, DraftState } from '../../store/api/leagueApi';

export interface DraftTurnNoticeInput {
  /** Draft state carried by the draftUpdated broadcast. */
  draft?: Partial<DraftState> | null;
  /** The pick that triggered the broadcast, if any. */
  pick?: Partial<DraftPickRecord> | null;
  myTeamId?: string | null;
  /** Pick number this client has already been told about. */
  lastNotifiedPick?: number | null;
}

export interface DraftTurnNotice {
  pickNumber: number;
  title: string;
  message: string;
}

/**
 * Whether a draft broadcast means "it is now your turn", and what to say.
 *
 * Snake order can put the same manager on the clock twice in a row at a round
 * boundary, so a notice is keyed on the pick number rather than on the turn
 * changing hands - that also makes a replayed event after a reconnect harmless.
 *
 * A manager is never told about the pick they just made: they already get a
 * confirmation, and a second toast would replace it.
 */
export const describeMyTurnNotice = ({
  draft,
  pick,
  myTeamId,
  lastNotifiedPick,
}: DraftTurnNoticeInput): DraftTurnNotice | null => {
  if (!draft || !myTeamId) return null;
  if (draft.status !== 'active' || draft.isTurnOrdered !== true) return null;

  const onClock = draft.currentTeam?.fantasyTeamId;
  if (!onClock || String(onClock) !== String(myTeamId)) return null;

  const pickNumber = draft.currentPick;
  if (typeof pickNumber !== 'number') return null;
  if (lastNotifiedPick === pickNumber) return null;

  if (pick?.fantasyTeamId && String(pick.fantasyTeamId) === String(myTeamId)) {
    return null;
  }

  const previous =
    pick?.cheerTeamName && pick?.teamName
      ? `${pick.teamName} took ${pick.cheerTeamName}. `
      : '';

  return {
    pickNumber,
    title: 'You are on the clock',
    message: `${previous}Pick ${pickNumber} is yours.`,
  };
};
