import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface League {
  id: string;
  name: string;
  membersCount: number;
  logoUri?: string;
  createdAt: number;
}

interface LeagueState {
  leagues: League[];
}

const initialState: LeagueState = {
  leagues: [],
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
    },
  },
});

export const { createLeague, deleteLeague } = leagueSlice.actions;

export default leagueSlice.reducer;
