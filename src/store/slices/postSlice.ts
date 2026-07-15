import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Post {
  id: string;
  authorName: string;
  authorHandle: string;
  timeAgo: string;
  authorAvatarUri?: string;
  caption: string;
  imageUri?: string;
  likesCount: number;
  commentsCount: number;
}

interface PostState {
  posts: Post[];
}

const initialState: PostState = {
  posts: [
    {
      id: '1',
      authorName: 'Real Madrid',
      authorHandle: 'Davidthomas097',
      timeAgo: '1d',
      authorAvatarUri: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/150px-Real_Madrid_CF.svg.png',
      caption: 'The Grizzlies lineup is TUFF',
      imageUri: 'https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=2070&auto=format&fit=crop',
      likesCount: 231,
      commentsCount: 17,
    },
    {
      id: '2',
      authorName: 'Arsenal community',
      authorHandle: 'Davidthomas097',
      timeAgo: '1d',
      authorAvatarUri: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/150px-Arsenal_FC.svg.png',
      caption: 'Great atmosphere today!',
      imageUri: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
      likesCount: 154,
      commentsCount: 12,
    },
  ],
};

const postSlice = createSlice({
  name: 'post',
  initialState,
  reducers: {
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload);
    },
  },
});

export const { addPost } = postSlice.actions;
export default postSlice.reducer;
