import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, Text, View, ViewStyle } from 'react-native';

interface AvatarProps {
  /** Signed URL from the API, or a local file:// path while a draft is pending. */
  uri?: string | null;
  /** Used for the initials fallback. */
  name?: string | null;
  size?: number;
  /** Accepts either shape: the component renders an Image or a View. */
  style?: StyleProp<ViewStyle | ImageStyle>;
}

function initialsOf(name?: string | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * The one place a user's picture is rendered.
 *
 * Replaces roughly fourteen copies of the same inline
 * `avatarUrl ?? 'https://i.pravatar.cc/150?img=11'` chain, which meant a missing
 * avatar showed a stranger's stock photo. The fallback here is the user's own
 * initials, and a URL that fails to load falls back to the same thing rather
 * than leaving an empty grey square.
 */
export const Avatar = ({ uri, name, size = 40, style }: AvatarProps) => {
  const [failed, setFailed] = useState(false);

  // A new uri deserves a fresh attempt — signed URLs expire and get reissued.
  useEffect(() => setFailed(false), [uri]);

  const dimensions = { width: size, height: size, borderRadius: size / 2 };
  const showImage = Boolean(uri) && !failed;

  if (showImage) {
    return (
      <Image
        source={{ uri: uri as string }}
        style={[dimensions, { backgroundColor: '#1E439B' }, style as StyleProp<ImageStyle>]}
        onError={() => setFailed(true)}
        accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
      />
    );
  }

  return (
    <View
      style={[dimensions, { backgroundColor: '#1E439B' }, styles.center, style as StyleProp<ViewStyle>]}
      accessibilityLabel={name ? `${name}, no avatar set` : 'No avatar set'}
    >
      <Text style={{ color: '#fff', fontSize: Math.max(9, size * 0.36), fontWeight: '700' }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
};

const styles = {
  center: { justifyContent: 'center', alignItems: 'center' } as const,
};

export default Avatar;
