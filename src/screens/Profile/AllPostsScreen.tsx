import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MoreVertical, MessageSquare } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const MOCK_POSTS = [
  {
    id: '1',
    team: 'Arsenal community',
    author: 'Davidthomas097',
    time: '1d',
    content: 'The Grizzlies lineup is TUFF',
    likes: 231,
    comments: 17,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/150px-Arsenal_FC.svg.png'
  },
  {
    id: '2',
    team: 'Real Madrid',
    author: 'Davidthomas097',
    time: '1d',
    content: 'The Grizzlies lineup is TUFF',
    likes: 231,
    comments: 17,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/150px-Real_Madrid_CF.svg.png'
  },
  {
    id: '3',
    team: 'Real Madrid',
    author: 'Davidthomas097',
    time: '1d',
    content: 'The Grizzlies lineup is TUFF',
    likes: 231,
    comments: 17,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/150px-Real_Madrid_CF.svg.png'
  }
];

export default function AllPostsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-center px-5 pt-2 pb-6 relative">
        <TouchableOpacity 
          className="absolute left-5 top-2 w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40 z-10"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-bold mt-3">All post</Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-6">
        <View className="flex-row items-center border border-[#6B21A8] rounded-[20px] px-4 py-3 bg-[#0a0a0a]">
          <Search color="#666" size={18} className="mr-3" />
          <TextInput 
            className="flex-1 text-white text-[14px] p-0 m-0"
            placeholder="Search here."
            placeholderTextColor="#666"
          />
        </View>
      </View>

      {/* Posts List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}>
        {MOCK_POSTS.map((post) => (
          <View key={post.id} className="border border-[#333] rounded-[24px] p-4 mb-4 bg-[#0a0a0a]">
            {/* Post Header */}
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-row items-center">
                <Image source={{ uri: post.logo }} className="w-10 h-10 rounded-full bg-white mr-3" resizeMode="contain" />
                <View>
                  <Text className="text-white text-[15px] font-medium">{post.team}</Text>
                  <Text className="text-[#FFB84D] text-[12px]">
                    {post.author} <Text className="text-[#FFB84D]">→  {post.time}</Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity>
                <MoreVertical color="#999" size={20} />
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            <Text className="text-gray-300 text-[14px] mb-4">
              {post.content}
            </Text>
            
            {/* Post Actions */}
            <View className="flex-row justify-between items-end mt-2">
              {/* Reactions */}
              <View className="flex-col">
                <View className="flex-row relative w-[50px] mb-1">
                  <View className="w-6 h-6 rounded-full bg-[#111] justify-center items-center absolute left-0 z-30">
                    <Text className="text-[14px]">😂</Text>
                  </View>
                  <View className="w-6 h-6 rounded-full bg-[#111] justify-center items-center absolute left-3 z-20">
                    <Text className="text-[14px]">👍</Text>
                  </View>
                  <View className="w-6 h-6 rounded-full bg-[#111] justify-center items-center absolute left-6 z-10">
                    <Text className="text-[14px]">❤️</Text>
                  </View>
                </View>
                <Text className="text-gray-400 text-[12px] mt-6">{post.likes}</Text>
              </View>

              {/* Comments */}
              <View className="flex-col items-center">
                <TouchableOpacity className="mb-2">
                  <MessageSquare color="#999" size={18} />
                </TouchableOpacity>
                <Text className="text-gray-400 text-[12px]">{post.comments}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
