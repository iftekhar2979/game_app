import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CornerUpLeft,
  ImagePlus,
  MessageCircle,
  Send,
  Smile,
  X,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import EmojiPicker from 'rn-emoji-keyboard';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootStackParamList } from '../../../App';
import {
  ChatOlderSkeleton,
  LeagueChatSkeleton,
} from '../../components/Skeleton';
import { RootState } from '../../store';
import {
  LeagueChatAttachment,
  LeagueChatMessage,
  LeagueChatReactionSummary,
  useLazyGetLeagueChatMessagesQuery,
  useMarkLeagueChatReadMutation,
  useReactToLeagueChatMessageMutation,
  useSendLeagueChatMessageMutation,
} from '../../store/api/leagueChatApi';
import { useLazyGetPreSignedUrlQuery } from '../../store/api/usersApi';
import {
  clearUnread,
  setActiveChatLeague,
} from '../../store/slices/leagueChatSlice';
import {
  getSocket,
  joinLeagueRoom,
  leaveLeagueRoom,
} from '../../services/socketService';
import { PickedImage, uploadImage } from '../../services/mediaUpload';
import {
  haptic,
  playSound,
  preloadFeedbackSounds,
} from '../../feedback/feedback';
import { showToast } from '../../utils/toast';
import { mergeNewestFirst } from '../../utils/leagueChatThread';
import {
  QUICK_REACTIONS,
  myReaction,
  toggleReactionLocally,
} from '../../utils/chatReactions';

type Props = NativeStackScreenProps<RootStackParamList, 'LeagueChat'>;
type PendingImage = PickedImage & { width?: number; height?: number };

/** Chat photos are for sharing a moment, not archiving originals. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_WIDTH = 220;

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

const isHttpUrl = (value?: string | null) =>
  Boolean(value && (value.startsWith('https://') || value.startsWith('http://')));

const nameOf = (message: LeagueChatMessage) =>
  message.sender.fullName || message.sender.username || 'League member';

const newClientMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Reserve the image's shape before it loads, so the thread does not jump. */
const imageSize = (image: LeagueChatAttachment) => {
  if (!image.width || !image.height) {
    return { width: IMAGE_WIDTH, height: IMAGE_WIDTH };
  }
  const height = Math.round((IMAGE_WIDTH * image.height) / image.width);
  return { width: IMAGE_WIDTH, height: Math.min(300, Math.max(120, height)) };
};

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
  const [replyTarget, setReplyTarget] = useState<LeagueChatMessage | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [actionMessage, setActionMessage] = useState<LeagueChatMessage | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const loadingOlderRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const [loadMessages] = useLazyGetLeagueChatMessagesQuery();
  const [markRead] = useMarkLeagueChatReadMutation();
  const [sendMessage, { isLoading: isSending }] =
    useSendLeagueChatMessageMutation();
  const [reactToMessage] = useReactToLeagueChatMessageMutation();
  const [getPreSignedUrl] = useLazyGetPreSignedUrlQuery();
  const lastReadMessageIdRef = useRef<string | null>(null);
  const isBusy = isSending || isUploading;

  const isMineMessage = useCallback(
    (message: LeagueChatMessage) =>
      message.isMine === true ||
      (Boolean(currentUserId) && message.sender.id === currentUserId),
    [currentUserId],
  );

  useEffect(() => {
    preloadFeedbackSounds();
  }, []);

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
  const newestMessageId = messages[0]?.id;
  useEffect(() => {
    markNewestRead(newestMessageId);
  }, [markNewestRead, newestMessageId]);

  useEffect(() => {
    joinLeagueRoom(leagueId);
    return () => leaveLeagueRoom(leagueId);
  }, [leagueId]);

  const setReactions = useCallback(
    (messageId: string, reactions: LeagueChatReactionSummary[]) => {
      setMessages(current =>
        current.map(message =>
          message.id === messageId ? { ...message, reactions } : message,
        ),
      );
    },
    [],
  );

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

    const receiveReaction = (payload: {
      leagueId?: string;
      messageId?: string;
      reactions?: LeagueChatReactionSummary[];
    }) => {
      if (String(payload?.leagueId) !== String(leagueId) || !payload.messageId) {
        return;
      }
      setReactions(payload.messageId, payload.reactions ?? []);
    };

    socket.on('leagueChatMessage', receiveMessage);
    socket.on('leagueChatReaction', receiveReaction);
    return () => {
      socket.off('leagueChatMessage', receiveMessage);
      socket.off('leagueChatReaction', receiveReaction);
    };
  }, [leagueId, setReactions]);

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

  const pickImage = async () => {
    haptic('selection');
    try {
      // The system photo picker needs no storage permission on Android 13+.
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      const asset = result.assets?.[0];
      if (result.didCancel || !asset?.uri) return;

      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
        showToast.error('Image too large', 'Choose a photo under 10 MB.');
        return;
      }

      setPendingImage({
        uri: asset.uri,
        fileName: asset.fileName,
        type: asset.type,
        width: asset.width,
        height: asset.height,
      });
    } catch {
      showToast.error('Could not open your photos');
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    const image = pendingImage;
    const reply = replyTarget;
    if ((!text && !image) || isBusy) return;

    setDraft('');
    setPendingImage(null);
    setReplyTarget(null);

    try {
      let attachments: Array<{ key: string; width?: number; height?: number }> | undefined;

      if (image) {
        setIsUploading(true);
        // Straight to S3 with a pre-signed URL; the message stores only the key.
        const key = await uploadImage(image, getPreSignedUrl as any, 0, 'League_Chat');
        attachments = [
          {
            key,
            ...(image.width ? { width: image.width } : {}),
            ...(image.height ? { height: image.height } : {}),
          },
        ];
      }

      const created = await sendMessage({
        leagueId,
        clientMessageId: newClientMessageId(),
        ...(text ? { text } : {}),
        ...(attachments ? { attachments } : {}),
        ...(reply ? { replyToId: reply.id } : {}),
      }).unwrap();

      setMessages(current => mergeNewestFirst(current, [created]));
      // The Messenger-style "sent": a light tap and a short tick.
      haptic('impactLight');
      playSound('chat_send');
    } catch (error) {
      setDraft(text);
      setPendingImage(image);
      setReplyTarget(reply);
      showToast.error('Message not sent', errorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReact = async (message: LeagueChatMessage, emoji: string) => {
    const previous = message.reactions ?? [];
    const held = myReaction(previous, currentUserId);

    setReactions(message.id, toggleReactionLocally(previous, emoji, currentUserId));

    if (held === emoji) {
      haptic('soft');
    } else {
      haptic('impactLight');
      playSound('chat_react');
    }

    try {
      const updated = await reactToMessage({
        leagueId,
        messageId: message.id,
        emoji,
      }).unwrap();
      setReactions(updated.id, updated.reactions ?? []);
    } catch (error) {
      setReactions(message.id, previous);
      showToast.error('Reaction not saved', errorMessage(error));
    }
  };

  const openActions = (message: LeagueChatMessage) => {
    haptic('selection');
    setActionMessage(message);
  };

  const startReply = (message: LeagueChatMessage | null) => {
    if (!message) return;
    haptic('selection');
    setReplyTarget(message);
    setActionMessage(null);
    setTimeout(() => inputRef.current?.focus(), 250);
  };

  const openEmojiPicker = () => {
    haptic('selection');
    inputRef.current?.blur();
    setIsEmojiOpen(true);
  };

  const renderMessage = ({ item }: { item: LeagueChatMessage }) => {
    const isMine = isMineMessage(item);
    const images = item.attachments ?? [];
    const reactions = item.reactions ?? [];
    const mine = myReaction(reactions, currentUserId);
    const imageOnly = images.length > 0 && !item.text;

    return (
      <View style={[styles.messageRow, isMine && styles.mineRow]}>
        {!isMine &&
          (isHttpUrl(item.sender.avatarUrl) ? (
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
          {!isMine && <Text style={styles.senderName}>{nameOf(item)}</Text>}

          <Pressable
            onLongPress={() => openActions(item)}
            delayLongPress={250}
            style={[
              styles.bubble,
              isMine ? styles.mineBubble : styles.theirBubble,
              imageOnly && styles.imageOnlyBubble,
            ]}
            accessibilityHint="Long press to react or reply"
          >
            {item.replyTo ? (
              <View style={[styles.quote, isMine && styles.mineQuote]}>
                <Text style={styles.quoteName} numberOfLines={1}>
                  {item.replyTo.senderName || 'League member'}
                </Text>
                <Text style={styles.quoteText} numberOfLines={2}>
                  {item.replyTo.text || (item.replyTo.hasImage ? 'Photo' : '')}
                </Text>
              </View>
            ) : null}

            {images.map((image, index) => (
              <Pressable
                key={`${item.id}-image-${index}`}
                onPress={() => setViewerUrl(image.url)}
                onLongPress={() => openActions(item)}
                delayLongPress={250}
                accessibilityRole="imagebutton"
                accessibilityLabel="Open photo"
              >
                <Image
                  source={{ uri: image.url }}
                  style={[styles.bubbleImage, imageSize(image)]}
                  resizeMode="cover"
                />
              </Pressable>
            ))}

            {item.text ? (
              <Text style={[styles.messageText, images.length > 0 && styles.textUnderImage]}>
                {item.text}
              </Text>
            ) : null}
          </Pressable>

          {reactions.length > 0 ? (
            <View style={[styles.reactionRow, isMine && styles.mineReactionRow]}>
              {reactions.map(group => (
                <TouchableOpacity
                  key={group.emoji}
                  style={[styles.reactionChip, mine === group.emoji && styles.reactionChipMine]}
                  onPress={() => handleReact(item, group.emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={`${group.emoji} ${group.count}${mine === group.emoji ? ', yours' : ''}`}
                >
                  <Text style={styles.reactionEmoji}>{group.emoji}</Text>
                  {group.count > 1 ? (
                    <Text style={styles.reactionCount}>{group.count}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

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

  const canSend =
    (Boolean(draft.trim()) || Boolean(pendingImage)) && !isBusy && !loadError;
  const heldOnAction = actionMessage
    ? myReaction(actionMessage.reactions, currentUserId)
    : null;

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
            ListFooterComponent={loadingOlder ? <ChatOlderSkeleton /> : null}
          />
        )}

        {replyTarget ? (
          <View style={styles.replyBar}>
            <CornerUpLeft color="#E0B566" size={16} />
            <View style={styles.replyBarText}>
              <Text style={styles.replyBarTitle} numberOfLines={1}>
                {isMineMessage(replyTarget)
                  ? 'Replying to yourself'
                  : `Replying to ${nameOf(replyTarget)}`}
              </Text>
              <Text style={styles.replyBarBody} numberOfLines={1}>
                {replyTarget.text || (replyTarget.attachments?.length ? 'Photo' : '')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyTarget(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
            >
              <X color="#999" size={18} />
            </TouchableOpacity>
          </View>
        ) : null}

        {pendingImage ? (
          <View style={styles.pendingImageRow}>
            <View>
              <Image source={{ uri: pendingImage.uri }} style={styles.pendingImage} />
              <TouchableOpacity
                style={styles.pendingImageRemove}
                onPress={() => setPendingImage(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <X color="#FFFFFF" size={14} />
              </TouchableOpacity>
            </View>
            {isUploading ? (
              <Text style={styles.uploadingText}>Uploading photo...</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.composer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={pickImage}
            disabled={isBusy || Boolean(loadError)}
            accessibilityRole="button"
            accessibilityLabel="Attach a photo"
          >
            <ImagePlus color="#E0B566" size={22} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={pendingImage ? 'Add a caption...' : 'Message your league...'}
            placeholderTextColor="#777"
            multiline
            maxLength={1000}
            editable={!isBusy && !loadError}
          />
          <TouchableOpacity
            style={styles.iconButton}
            onPress={openEmojiPicker}
            disabled={Boolean(loadError)}
            accessibilityRole="button"
            accessibilityLabel="Add an emoji"
          >
            <Smile color="#E0B566" size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {isBusy ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Send color="#000" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <EmojiPicker
        open={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        onEmojiSelected={selected => {
          haptic('selection');
          setDraft(current => `${current}${selected.emoji}`);
        }}
        enableSearchBar
        categoryPosition="top"
      />

      <Modal
        visible={Boolean(actionMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMessage(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionMessage(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetReactions}>
              {QUICK_REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.sheetEmoji, heldOnAction === emoji && styles.sheetEmojiHeld]}
                  onPress={() => {
                    const target = actionMessage;
                    setActionMessage(null);
                    if (target) void handleReact(target, emoji);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`React with ${emoji}`}
                >
                  <Text style={styles.sheetEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => startReply(actionMessage)}
              accessibilityRole="button"
            >
              <CornerUpLeft color="#FFFFFF" size={18} />
              <Text style={styles.sheetActionText}>Reply</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(viewerUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerUrl(null)}>
          {viewerUrl ? (
            <Image source={{ uri: viewerUrl }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerUrl(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <X color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
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
    borderBottomColor: '#222',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 12 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#999', fontSize: 12, marginTop: 2 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1410',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  errorTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  stateText: { color: '#999', fontSize: 13, textAlign: 'center', marginTop: 6 },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#E0B566',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: '#000', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingVertical: 18 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 12 },
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
  senderName: { color: '#AFAFAF', fontSize: 11, marginBottom: 4, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  theirBubble: { backgroundColor: '#1A1A1A', borderBottomLeftRadius: 5 },
  mineBubble: { backgroundColor: '#6331A8', borderBottomRightRadius: 5 },
  imageOnlyBubble: { paddingHorizontal: 4, paddingVertical: 4 },
  messageText: { color: '#FFF', fontSize: 15, lineHeight: 20 },
  textUnderImage: { marginTop: 8, paddingHorizontal: 2 },
  bubbleImage: { borderRadius: 14, backgroundColor: '#222', marginTop: 2 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: '#E0B566',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  mineQuote: { backgroundColor: 'rgba(0,0,0,0.2)' },
  quoteName: { color: '#E0B566', fontSize: 11, fontWeight: '700' },
  quoteText: { color: '#DDD', fontSize: 12, marginTop: 2 },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -6,
    marginLeft: 8,
  },
  mineReactionRow: { marginLeft: 0, marginRight: 8, justifyContent: 'flex-end' },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginTop: 2,
  },
  reactionChipMine: { borderColor: '#E0B566', backgroundColor: '#2B2112' },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { color: '#DDD', fontSize: 11, marginLeft: 3, fontWeight: '600' },
  time: { color: '#666', fontSize: 10, marginTop: 4, marginLeft: 4 },
  mineTime: { marginLeft: 0, marginRight: 4 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
  },
  replyBarText: { flex: 1, marginHorizontal: 10 },
  replyBarTitle: { color: '#E0B566', fontSize: 12, fontWeight: '700' },
  replyBarBody: { color: '#BBB', fontSize: 12, marginTop: 1 },
  pendingImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#000',
  },
  pendingImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#222' },
  pendingImageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: { color: '#999', fontSize: 12, marginLeft: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
    backgroundColor: '#000',
  },
  iconButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: '#141414',
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    color: '#FFF',
    fontSize: 15,
    marginHorizontal: 4,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0B566',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  sendButtonDisabled: { opacity: 0.45 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
  },
  sheetReactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1F1F1F',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sheetEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEmojiHeld: { backgroundColor: '#2B2112', borderWidth: 1, borderColor: '#E0B566' },
  sheetEmojiText: { fontSize: 26 },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  sheetActionText: { color: '#FFF', fontSize: 15, marginLeft: 12, fontWeight: '600' },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
