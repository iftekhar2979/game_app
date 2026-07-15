import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Upload } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { addPost } from '../../store/slices/postSlice';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreatePostScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const avatars = useSelector((state: RootState) => state.avatar.savedAvatars);
  const userAvatarUri = avatars.length > 0 ? avatars[0].imageUri : 'https://i.pravatar.cc/150?img=11';

  const handleOpenGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });
    
    if (result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri || null);
    }
  };

  const handleSubmit = () => {
    if (!description && !imageUri) return;
    
    dispatch(addPost({
      id: Date.now().toString(),
      authorName: 'David !',
      authorHandle: 'Davidthomas097',
      timeAgo: 'Just now',
      authorAvatarUri: userAvatarUri,
      caption: description,
      imageUri: imageUri || undefined,
      likesCount: 0,
      commentsCount: 0,
    }));
    
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create post</Text>
      </View>

      <View style={styles.content}>
        {/* Image Upload Area */}
        <TouchableOpacity style={[styles.uploadArea, imageUri ? styles.uploadAreaFilled : null]} onPress={handleOpenGallery}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
          ) : (
            <>
              <View style={styles.uploadIconContainer}>
                <Upload color="#fff" size={16} />
              </View>
              <Text style={styles.uploadText}>add picture or banner</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Description Input */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Write description here..."
            placeholderTextColor="#666"
            multiline
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit post</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  uploadArea: {
    borderWidth: 1,
    borderColor: '#8B3DFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 120,
  },
  uploadAreaFilled: {
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: {
    color: '#fff',
    fontSize: 14,
  },
  inputArea: {
    borderWidth: 1,
    borderColor: '#8B3DFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginBottom: 20,
  },
  textInput: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  submitButton: {
    backgroundColor: '#8B3DFF',
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
