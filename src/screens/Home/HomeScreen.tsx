import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, MessageSquare, PlusSquare, ThumbsUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { CommentsModal } from '../../components/Home/CommentsModal';
import { addReaction, ReactionType } from '../../store/slices/postSlice';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;



export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const POSTS = useSelector((state: RootState) => state.post.posts);
  // If the user has generated an avatar, we can use it for their profile picture, otherwise a placeholder
  const avatars = useSelector((state: RootState) => state.avatar.savedAvatars);
  const userAvatarUri = avatars.length > 0 ? avatars[0].imageUri : 'https://i.pravatar.cc/150?img=11';

  const createdLeagues = useSelector((state: RootState) => state.league.leagues);
  const mockLeagues = [
    { id: 'mock-1', name: '2026 Final cheer', logoUri: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/150px-Liverpool_FC.svg.png' },
    { id: 'mock-2', name: '2026 Final cheer', logoUri: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/150px-Liverpool_FC.svg.png' },
  ];
  const allLeagues = [...createdLeagues, ...mockLeagues];

  const [isCommentsModalVisible, setIsCommentsModalVisible] = React.useState(false);
  const [activeCommentCount, setActiveCommentCount] = React.useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = React.useState<string | null>(null);
  const [activeTooltipPostId, setActiveTooltipPostId] = React.useState<string | null>(null);

  const openComments = (commentCount: number, postId: string) => {
    setActiveCommentCount(commentCount);
    setActiveCommentPostId(postId);
    setIsCommentsModalVisible(true);
  };

  const handleReaction = (postId: string, reaction: ReactionType) => {
    dispatch(addReaction({ postId, reaction }));
    setActiveTooltipPostId(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Image source={{ uri: userAvatarUri }} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>David !</Text>
            <Text style={styles.userSubtext}>Welcome to CHEERBATTLE</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bellButton}>
          <Bell color="#999" size={22} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>0</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Fantasy Section */}
        <View style={styles.fantasySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fantasy</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FantasyLeague')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {allLeagues.map(league => (
              <TouchableOpacity 
                key={league.id} 
                style={styles.fantasyCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('LeagueDetail', { leagueId: league.id })}
              >
                {league.logoUri ? (
                  <Image source={{ uri: league.logoUri }} style={styles.cardLogoPlaceholder} />
                ) : (
                  <View style={styles.cardLogoPlaceholder} />
                )}
                <View>
                  <Text style={styles.cardTitle}>{league.name}</Text>
                  <Text style={styles.cardSubtext}>Fantasy Cheerleading</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Feed Section */}
        <View style={styles.feedSection}>
          {POSTS.map(post => {
            const totalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);
            return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                {post.authorAvatarUri ? (
                  <Image source={{ uri: post.authorAvatarUri }} style={styles.postAuthorAvatar} />
                ) : (
                  <View style={styles.postAuthorAvatar} />
                )}
                <View style={styles.postAuthorInfo}>
                  <Text style={styles.postAuthorName}>{post.authorName}</Text>
                  <Text style={styles.postAuthorHandle}>{post.authorHandle} → {post.timeAgo}</Text>
                </View>
              </View>
              <Text style={styles.postCaption}>{post.caption}</Text>
              <Image source={{ uri: post.imageUri }} style={styles.postImage} />
              <View style={styles.postFooter}>
                <View style={styles.reactionGroup}>
                  <TouchableOpacity 
                    onPress={() => handleReaction(post.id, 'like')}
                    onLongPress={() => setActiveTooltipPostId(activeTooltipPostId === post.id ? null : post.id)}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <ThumbsUp color={post.userReaction === 'like' ? "#E0B566" : "#999"} size={18} style={{ marginRight: 6 }} />
                    <View style={styles.emojiStack}>
                      {post.reactions.haha > 0 && <View style={[styles.stackedEmojiContainer, { zIndex: 4 }]}><Text style={styles.stackedEmoji}>😂</Text></View>}
                      {post.reactions.like > 0 && <View style={[styles.stackedEmojiContainer, { zIndex: 3, marginLeft: -6 }]}><Text style={styles.stackedEmoji}>👍</Text></View>}
                      {post.reactions.angry > 0 && <View style={[styles.stackedEmojiContainer, { zIndex: 2, marginLeft: -6 }]}><Text style={styles.stackedEmoji}>😡</Text></View>}
                      {post.reactions.love > 0 && <View style={[styles.stackedEmojiContainer, { zIndex: 1, marginLeft: -6 }]}><Text style={styles.stackedEmoji}>❤️</Text></View>}
                    </View>
                    <Text style={styles.reactionCount}>{totalReactions}</Text>
                  </TouchableOpacity>

                  {/* Tooltip for reactions */}
                  {activeTooltipPostId === post.id && (
                    <View style={styles.reactionsTooltip}>
                      <TouchableOpacity onPress={() => handleReaction(post.id, 'like')}><Text style={styles.tooltipEmoji}>👍</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleReaction(post.id, 'love')}><Text style={styles.tooltipEmoji}>❤️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleReaction(post.id, 'haha')}><Text style={styles.tooltipEmoji}>😂</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleReaction(post.id, 'angry')}><Text style={styles.tooltipEmoji}>😡</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.commentGroup} 
                  onPress={() => openComments(post.commentsCount, post.id)}
                >
                  <Text style={styles.commentCount}>{post.commentsCount} Comments</Text>
                  <MessageSquare color="#999" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          )})}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <PlusSquare color="#fff" size={24} />
      </TouchableOpacity>

      <CommentsModal 
        isVisible={isCommentsModalVisible} 
        onClose={() => setIsCommentsModalVisible(false)} 
        commentCount={activeCommentCount}
        postId={activeCommentPostId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userSubtext: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff3b30',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  fantasySection: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#E0B566',
    fontSize: 14,
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingLeft: 20,
  },
  fantasyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    width: 260,
  },
  cardLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cardSubtext: {
    color: '#E0B566',
    fontSize: 13,
    marginTop: 4,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#444',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#E0B566',
  },
  feedSection: {
    marginTop: 20,
  },
  postCard: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E439B',
    marginRight: 12,
  },
  postAuthorInfo: {
    justifyContent: 'center',
  },
  postAuthorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  postAuthorHandle: {
    color: '#E0B566',
    fontSize: 13,
    marginTop: 2,
  },
  postCaption: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#222',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  reactionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  reactionsTooltip: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
  },
  tooltipEmoji: {
    fontSize: 24,
    marginHorizontal: 4,
  },
  emojiStack: {
    flexDirection: 'row',
    marginRight: 10,
  },
  stackedEmojiContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0a0a0a',
  },
  stackedEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    color: '#fff',
    fontSize: 14,
  },
  commentGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCount: {
    color: '#ccc',
    fontSize: 13,
    marginRight: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#8B3DFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B3DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
