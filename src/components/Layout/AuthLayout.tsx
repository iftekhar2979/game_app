import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AuthLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

const AuthLayout = ({ children, scrollable = true }: AuthLayoutProps) => {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={{ flexGrow: 1, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }}>
      {children}
    </View>
  );

  return (
    <ImageBackground 
      source={require('../../assets/images/authbg.png')}
      style={{ flex: 1, backgroundColor: '#05000A' }}
      resizeMode="cover"
    >

      <KeyboardAvoidingView
        style={{ flex: 1, zIndex: 10 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default AuthLayout;
