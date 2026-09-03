import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LeagueChatState {
  /** Unread message count per league, kept in sync from realtime events. */
  unreadByLeague: Record<string, number>;
  /** League whose chat screen is currently open - it never accrues unreads. */
  activeChatLeagueId: string | null;
}

const initialState: LeagueChatState = {
  unreadByLeague: {},
  activeChatLeagueId: null,
};

const leagueChatSlice = createSlice({
  name: 'leagueChat',
  initialState,
  reducers: {
    setUnreadCount: (
      state,
      action: PayloadAction<{ leagueId: string; count: number }>,
    ) => {
      const { leagueId, count } = action.payload;
      state.unreadByLeague[leagueId] = Math.max(0, count);
    },
    incrementUnread: (state, action: PayloadAction<string>) => {
      const leagueId = action.payload;
      if (state.activeChatLeagueId === leagueId) return;
      state.unreadByLeague[leagueId] = (state.unreadByLeague[leagueId] || 0) + 1;
    },
    clearUnread: (state, action: PayloadAction<string>) => {
      state.unreadByLeague[action.payload] = 0;
    },
    setActiveChatLeague: (state, action: PayloadAction<string | null>) => {
      state.activeChatLeagueId = action.payload;
      if (action.payload) state.unreadByLeague[action.payload] = 0;
    },
    resetLeagueChatState: () => initialState,
  },
});

export const {
  setUnreadCount,
  incrementUnread,
  clearUnread,
  setActiveChatLeague,
  resetLeagueChatState,
} = leagueChatSlice.actions;

export const selectLeagueUnreadCount =
  (leagueId: string) =>
  (state: { leagueChat: LeagueChatState }): number =>
    state.leagueChat.unreadByLeague[leagueId] || 0;

export default leagueChatSlice.reducer;
