import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SavedAvatar {
  id: string;
  imageUri: string;
  configuration: {
    target: string;
    avatarCategory: number;
    isFullbody: boolean;
    details: any;
  };
  createdAt: number;
}

interface AvatarState {
  savedAvatars: SavedAvatar[];
}

const initialState: AvatarState = {
  savedAvatars: [],
};

export const avatarSlice = createSlice({
  name: 'avatar',
  initialState,
  reducers: {
    saveAvatar: (state, action: PayloadAction<SavedAvatar>) => {
      state.savedAvatars.push(action.payload);
    },
    deleteAvatar: (state, action: PayloadAction<string>) => {
      state.savedAvatars = state.savedAvatars.filter(
        (avatar) => avatar.id !== action.payload
      );
    },
  },
});

export const { saveAvatar, deleteAvatar } = avatarSlice.actions;

export default avatarSlice.reducer;
