import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Upload, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootStackParamList } from '../../../App';
import CustomLoader from '../../components/Loader/CustomLoader';
import { PickedImage, uploadImages } from '../../services/mediaUpload';
import { useCreatePostMutation } from '../../store/api/socialApi';
import { useLazyGetPreSignedUrlQuery } from '../../store/api/usersApi';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** Mirrors the backend SOCIAL_LIMITS so the user is told before the round trip. */
const MAX_IMAGES = 10;
const MAX_CONTENT_LENGTH = 5000;

export default function CreatePostScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Reuses the same pre-signed upload endpoint as avatars and league logos.
  const [getPreSignedUrl] = useLazyGetPreSignedUrlQuery();
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();

  const isBusy = isUploading || isCreating;
  const canSubmit = content.trim().length > 0 && !isBusy;

  const handlePickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      showToast.warning(`You can attach up to ${MAX_IMAGES} images`);
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: remaining,
      });

      if (result.didCancel || !result.assets?.length) return;

      setImages((current) => [
        ...current,
        ...result.assets!
          .filter((asset) => Boolean(asset.uri))
          .map((asset) => ({
            uri: asset.uri as string,
            fileName: asset.fileName,
            type: asset.type,
          })),
      ]);
    } catch (err: any) {
      showToast.error('Could not open your photo library', err?.message);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((current) => current.filter((_, position) => position !== index));
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();

    if (!trimmed) {
      showToast.warning('Write something before posting');
      return;
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      showToast.warning(`Posts are limited to ${MAX_CONTENT_LENGTH} characters`);
      return;
    }

    try {
      // Images upload first: the post stores their S3 keys, so a failed upload
      // must not leave a post referencing images that were never stored.
      setIsUploading(true);
      const imageUrls = await uploadImages(images, getPreSignedUrl as any);
      setIsUploading(false);

      const post = await createPost({ content: trimmed, imageUrls }).unwrap();

      showToast.success(
        post.isFlagged ? 'Posted — under review' : 'Posted',
        post.isFlagged
          ? 'Our filters flagged this for review, so only you can see it for now.'
          : undefined,
      );
      navigation.goBack();
    } catch (err: any) {
      setIsUploading(false);
      showToast.error('Could not publish your post', err?.data?.message || err?.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2.5 pb-5">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl border border-[#333] justify-center items-center mr-3"
          onPress={() => navigation.goBack()}
          disabled={isBusy}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-bold">Create post</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            className="border border-dashed border-[#333] rounded-2xl h-[120px] justify-center items-center mb-4"
            onPress={handlePickImages}
            disabled={isBusy}
            accessibilityLabel="Add pictures"
            accessibilityRole="button"
          >
            <View className="w-8 h-8 rounded-full bg-[#8B3DFF] justify-center items-center mb-2">
              <Upload color="#fff" size={16} />
            </View>
            <Text className="text-gray-400 text-[13px]">
              {images.length
                ? `Add more (${images.length}/${MAX_IMAGES})`
                : 'add picture or banner'}
            </Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ gap: 8 }}
            >
              {images.map((image, index) => (
                <View key={`${image.uri}-${index}`} className="relative">
                  <Image
                    source={{ uri: image.uri }}
                    className="w-[90px] h-[90px] rounded-xl bg-[#222]"
                  />
                  <TouchableOpacity
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black border border-[#444] justify-center items-center"
                    onPress={() => handleRemoveImage(index)}
                    disabled={isBusy}
                    accessibilityLabel={`Remove image ${index + 1}`}
                    accessibilityRole="button"
                  >
                    <X color="#fff" size={13} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View className="border border-[#333] rounded-2xl p-4 min-h-[160px]">
            <TextInput
              className="text-white text-[15px] flex-1"
              placeholder="Write description here..."
              placeholderTextColor="#666"
              multiline
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
              maxLength={MAX_CONTENT_LENGTH}
              editable={!isBusy}
            />
          </View>
          <Text className="text-gray-600 text-[11px] text-right mt-1.5">
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>
        </ScrollView>

        <View className="px-5 pb-4 pt-2">
          <TouchableOpacity
            className={`h-[52px] rounded-2xl justify-center items-center flex-row ${
              canSubmit ? 'bg-[#8B3DFF]' : 'bg-[#2a2a2a]'
            }`}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityLabel="Submit post"
            accessibilityRole="button"
          >
            {isBusy ? (
              <>
                <CustomLoader size={18} color="#fff" strokeWidth={2} />
                <Text className="text-white font-bold text-[15px] ml-2.5">
                  {isUploading ? 'Uploading images…' : 'Publishing…'}
                </Text>
              </>
            ) : (
              <Text
                className={`font-bold text-[15px] ${canSubmit ? 'text-white' : 'text-gray-500'}`}
              >
                Submit post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
