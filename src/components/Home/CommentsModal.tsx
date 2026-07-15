import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { incrementCommentCount } from '../../store/slices/postSlice';

const INITIAL_COMMENTS = [
  { id: '1', author: 'Thomas', time: 'Sun,12:40pm', content: 'Absolutely crushed it! What an amazing performance!', avatarBg: '#ffe5a0', avatarUri: 'https://i.pravatar.cc/150?img=11' },
  { id: '2', author: 'Petra', time: 'Mon,11:50pm', content: 'The synchronization was incredible. Great job, team!', avatarBg: '#bdf1f6', avatarUri: 'https://i.pravatar.cc/150?img=5' },
  { id: '3', author: 'David', time: 'Tue,10:56pm', content: 'Those stunts were flawless! Keep shining!', avatarBg: '#b8eeb0', avatarUri: 'https://i.pravatar.cc/150?img=12' },
  { id: '4', author: 'Kenio', time: 'Tue,10:56pm', content: 'Your energy and spirit were next level. So inspiring!', avatarBg: '#d9d1d0', avatarUri: 'https://i.pravatar.cc/150?img=33' },
  { id: '5', author: 'Isabella', time: 'Tue,10:58pm', content: 'Wow! That routine deserved a standing ovation!', avatarBg: '#ffb3c6', avatarUri: 'https://i.pravatar.cc/150?img=9' },
];

export const CommentsModal = ({ isVisible, onClose, commentCount, postId }: any) => {
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const dispatch = useDispatch();

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now().toString(),
      author: 'David',
      time: 'Just now',
      content: newComment,
      avatarBg: '#d9d1d0',
      avatarUri: 'https://i.pravatar.cc/150?img=11'
    };

    setComments([comment, ...comments]);
    setNewComment('');
    if (postId) {
      dispatch(incrementCommentCount(postId));
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/60 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="w-full"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="w-full bg-white rounded-t-[32px] pt-4 pb-8 px-6"
            style={{ maxHeight: 600 }}
          >
            {/* Handle Bar */}
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            {/* Title */}
            <Text className="text-black text-[20px] font-semibold mb-6">{commentCount + (comments.length - INITIAL_COMMENTS.length)} comments</Text>

            {/* Comments List */}
            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {comments.map((comment) => (
                <View key={comment.id} className="flex-row mb-6">
                  <View className="w-10 h-10 rounded-full justify-center items-center mr-4 mt-1" style={{ backgroundColor: comment.avatarBg }}>
                    <Image source={{ uri: comment.avatarUri }} className="w-9 h-9 rounded-full" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-gray-700 text-[14px] font-medium">{comment.author}</Text>
                      <Text className="text-gray-400 text-[10px]">{comment.time}</Text>
                    </View>
                    <Text className="text-gray-600 text-[13px] leading-5">{comment.content}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Input Field */}
            <View className="border border-gray-300 rounded-full px-5 mt-2 flex-row items-center">
              <TextInput
                placeholder="Add your comments"
                placeholderTextColor="#666"
                className="text-black text-[14px] h-[44px] flex-1"
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={handleAddComment}
                returnKeyType="send"
              />
              {newComment.trim().length > 0 && (
                <TouchableOpacity onPress={handleAddComment} className="ml-2">
                  <Text className="text-[#8B3DFF] font-semibold">Post</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};
