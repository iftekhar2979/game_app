import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MessageCircle, Send } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../App';
import {
  ChatOlderSkeleton,
  LeagueChatSkeleton,
} from '../../components/Skeleton';
import { RootState } from '../../store';
import {
  LeagueChatMessage,
  useLazyGetLeagueChatMessagesQuery,
  useMarkLeagueChatReadMutation,
  useSendLeagueChatMessageMutation,
} from '../../store/api/leagueChatApi';
import {
  clearUnread,
  setActiveChatLeague,
} from '../../store/slices/leagueChatSlice';
import {
  getSocket,
  joinLeagueRoom,
  leaveLeagueRoom,
} from '../../services/socketService';
import { showToast } from '../../utils/toast';
import { mergeNewestFirst } from '../../utils/leagueChatThread';

type Props = NativeStackScreenProps<RootStackParamList, 'LeagueChat'>;

const initialsFor = (message: LeagueChatMessage) => {
  const label = message.sender.fullName || message.sender.username || 'Member';
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const errorMessage = (error: any) =>
  error?.data?.message || error?.error || 'Please try again.';

export default function LeagueChatScreen({ navigation, route }: Props) {
  const { leagueId, leagueName } = route.params;
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const currentUserId = String(currentUser?.id || currentUser?._id || '');
  const [messages, setMessages] = useState<LeagueChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadingOlderRef = useRef(false);
  const [loadMessages] = useLazyGetLeagueChatMessagesQuery();
  const [markRead] = useMarkLeagueChatReadMutation();
  const [sendMessage, { isLoading: isSending }] =
    useSendLeagueChatMessageMutation();
  const lastReadMessageIdRef = useRef<string | null>(null);

  // While this screen is open the league never accrues unread messages.
  useEffect(() => {
    dispatch(setActiveChatLeague(leagueId));
    return () => {
      dispatch(setActiveChatLeague(null));
    };
  }, [dispatch, leagueId]);

  const markNewestRead = useCallback(
    (newestMessageId?: string) => {
      if (!newestMessageId || lastReadMessageIdRef.current === newestMessageId) {
        return;
      }
      lastReadMessageIdRef.current = newestMessageId;
      dispatch(clearUnread(leagueId));
      markRead({ leagueId, upToMessageId: newestMessageId })
        .unwrap()
        .catch(() => {
          // A failed read receipt only means the badge reappears next launch.
          lastReadMessageIdRef.current = null;
        });
    },
    [dispatch, leagueId, markRead],
  );

  const loadInitial = useCallback(async () => {
    setInitialLoading(true);
    setLoadError(null);
    try {
      const page = await loadMessages({ leagueId, limit: 30 }, false).unwrap();
      setMessages(page.messages);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setInitialLoading(false);
    }
  }, [leagueId, loadMessages]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // One place marks the thread read - whenever the newest message changes,
  // whether it arrived from the first page, the socket, or our own send.
  // Loading OLDER pages never changes messages[0], so paging back does not
  // move the read cursor.
  const newestMessageId = messages[0]?.id;
  useEffect(() => {
    markNewestRead(newestMessageId);
  }, [markNewestRead, newestMessageId]);

  useEffect(() => {
    joinLeagueRoom(leagueId);
    return () => leaveLeagueRoom(leagueId);
  }, [leagueId]);

  useEffect(() => {
    const socket = getSocket();

    const receiveMessage = (payload: {
      leagueId?: string;
      message?: LeagueChatMessage;
    }) => {
      if (String(payload?.leagueId) !== String(leagueId) || !payload.message) {
        return;
      }
      const incoming = payload.message as LeagueChatMessage;
      setMessages(current => mergeNewestFirst(current, [incoming]));
    };

    socket.on('leagueChatMessage', receiveMessage);
    return () => {
      socket.off('leagueChatMessage', receiveMessage);
    };
  }, [leagueId]);

  const loadOlder = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await loadMessages(
        { leagueId, before: nextCursor, limit: 30 },
        false,
      ).unwrap();
      setMessages(current => mergeNewestFirst(current, page.messages));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      showToast.error('Could not load earlier messages', errorMessage(error));
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [hasMore, leagueId, loadMessages, nextCursor]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    const clientMessageId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    setDraft('');
    try {
      const created = await sendMessage({
        leagueId,
        text,
        clientMessageId,
      }).unwrap();
      setMessages(current => mergeNewestFirst(current, [created]));
    } catch (error) {
      setDraft(text);
      showToast.error('Message not sent', errorMessage(error));
    }
  };

  const renderMessage = ({ item }: { item: LeagueChatMessage }) => {
    const isMine =
      item.isMine === true ||
      (Boolean(currentUserId) && item.sender.id === currentUserId);
    const senderName =
      item.sender.fullName || item.sender.username || 'League member';
    const usableAvatar = /^https?:\/\//i.test(item.sender.avatarUrl || '');

    return (
      <View style={[styles.messageRow, isMine && styles.mineRow]}>
        {!isMine &&
          (usableAvatar ? (
            <Image
              source={{ uri: item.sender.avatarUrl! }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initialsFor(item)}</Text>
            </View>
          ))}
        <View style={[styles.messageBlock, isMine && styles.mineBlock]}>
          {!isMine && <Text style={styles.senderName}>{senderName}</Text>}
          <View
            style={[
              styles.bubble,
              isMine ? styles.mineBubble : styles.theirBubble,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
          <Text style={[styles.time, isMine && styles.mineTime]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ChevronLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>League Chat</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {leagueName || 'Season-long league'}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MessageCircle color="#E0B566" size={20} />
          </View>
        </View>

        {initialLoading ? (
          <LeagueChatSkeleton />
        ) : loadError ? (
          <View style={styles.centerState}>
            <Text style={styles.errorTitle}>Chat is unavailable</Text>
            <Text style={styles.stateText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadInitial}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={
              messages.length ? styles.list : styles.emptyList
            }
            keyboardShouldPersistTaps="handled"
            onEndReached={loadOlder}
            onEndReachedThreshold={0.25}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MessageCircle color="#555" size={38} />
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.stateText}>
                  Messages are visible only to active league members.
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingOlder ? <ChatOlderSkeleton /> : null
            }
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message your league..."
            placeholderTextColor="#777"
            multiline
            maxLength={1000}
            editable={!isSending && !loadError}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!draft.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!draft.trim() || isSending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {isSending ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Send color="#000" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#282828',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginHorizontal: 12 },
  title: { color: '#FFF', fontSize: 19, fontWeight: '700' },
  subtitle: { color: '#999', fontSize: 12, marginTop: 2 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#211B10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingVertical: 18 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
    paddingRight: 48,
  },
  mineRow: { justifyContent: 'flex-start', paddingRight: 0, paddingLeft: 48 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#30233F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#D5B4FF', fontWeight: '700', fontSize: 11 },
  messageBlock: { alignItems: 'flex-start', maxWidth: '88%' },
  mineBlock: { alignItems: 'flex-end', marginLeft: 'auto' },
  senderName: {
    color: '#AFAFAF',
    fontSize: 11,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  theirBubble: { backgroundColor: '#1A1A1A', borderBottomLeftRadius: 5 },
  mineBubble: { backgroundColor: '#6331A8', borderBottomRightRadius: 5 },
  messageText: { color: '#FFF', fontSize: 15, lineHeight: 20 },
  time: { color: '#666', fontSize: 10, marginTop: 4, marginLeft: 4 },
  mineTime: { marginLeft: 0, marginRight: 4 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  stateText: {
    color: '#8F8F8F',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
  },
  errorTitle: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  retryButton: {
    backgroundColor: '#E0B566',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 18,
  },
  retryText: { color: '#000', fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { color: '#FFF', fontSize: 17, fontWeight: '700', marginTop: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#282828',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#090909',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    color: '#FFF',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0B566',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 9,
  },
  sendButtonDisabled: { opacity: 0.4 },
});
