import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface League {
  id: string;
  name: string;
  membersCount: number;
  logoUri?: string;
  draftDate?: string;
  draftTime?: string;
  visibility?: 'public' | 'private';
  createdAt: number;
}

export interface ActiveTeamInfo {
  teamId: string;
  teamName?: string;
  role?: string;
}

interface LeagueState {
  leagues: League[];
  activeTeams: Record<string, ActiveTeamInfo>;
}

const initialState: LeagueState = {
  leagues: [],
  activeTeams: {},
};

export const leagueSlice = createSlice({
  name: 'league',
  initialState,
  reducers: {
    createLeague: (state, action: PayloadAction<League>) => {
      state.leagues.push(action.payload);
    },
    deleteLeague: (state, action: PayloadAction<string>) => {
      state.leagues = state.leagues.filter(
        (league) => league.id !== action.payload
      );
      delete state.activeTeams[action.payload];
    },
    setActiveTeam: (
      state,
      action: PayloadAction<{ leagueId: string; teamId: string; teamName?: string; role?: string }>
    ) => {
      const { leagueId, teamId, teamName, role } = action.payload;
      state.activeTeams[leagueId] = { teamId, teamName, role };
    },
  },
});

export const { createLeague, deleteLeague, setActiveTeam } = leagueSlice.actions;

export default leagueSlice.reducer;
