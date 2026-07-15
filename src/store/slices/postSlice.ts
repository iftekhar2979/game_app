import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ReactionType = 'like' | 'love' | 'haha' | 'angry';

export interface Reactions {
  like: number;
  love: number;
  haha: number;
  angry: number;
}

export interface Post {
  id: string;
  authorName: string;
  authorHandle: string;
  timeAgo: string;
  authorAvatarUri?: string;
  caption: string;
  imageUri?: string;
  reactions: Reactions;
  userReaction?: ReactionType | null;
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
      reactions: { like: 231, love: 12, haha: 5, angry: 0 },
      commentsCount: 0,
    },
    {
      id: '2',
      authorName: 'Arsenal community',
      authorHandle: 'Davidthomas097',
      timeAgo: '1d',
      authorAvatarUri: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/150px-Arsenal_FC.svg.png',
      caption: 'Great atmosphere today!',
      imageUri: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
      reactions: { like: 154, love: 8, haha: 0, angry: 2 },
      commentsCount: 0,
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
    addReaction: (state, action: PayloadAction<{ postId: string; reaction: ReactionType }>) => {
      const post = state.posts.find(p => p.id === action.payload.postId);
      if (post) {
        if (post.userReaction) {
          post.reactions[post.userReaction] = Math.max(0, post.reactions[post.userReaction] - 1);
        }
        if (post.userReaction === action.payload.reaction) {
          post.userReaction = null; // Toggle off
        } else {
          post.reactions[action.payload.reaction]++;
          post.userReaction = action.payload.reaction;
        }
      }
    },
    incrementCommentCount: (state, action: PayloadAction<string>) => {
      const post = state.posts.find(p => p.id === action.payload);
      if (post) {
        post.commentsCount++;
      }
    },
  },
});

export const { addPost, addReaction, incrementCommentCount } = postSlice.actions;
export default postSlice.reducer;
