import React, { useEffect, useState, useRef } from 'react';
import { Animated, Text, View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { toastEmitter, ToastOptions } from '../../utils/toast';

export const ToastContainer = () => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const unsubscribe = toastEmitter.subscribe((options) => {
      setToast(options);

      translateY.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        hideToast();
      }, options.duration || 4500);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  };

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';
  const isError = toast.type === 'error';

  const borderColor = isSuccess ? '#00E676' : isWarning ? '#FFB300' : isError ? '#FF4D4D' : '#A855F7';
  const iconColor = isSuccess ? '#00E676' : isWarning ? '#FFB300' : isError ? '#FF4D4D' : '#A855F7';
  const bgBadgeColor = isSuccess
    ? 'rgba(0,230,118,0.2)'
    : isWarning
    ? 'rgba(255,179,0,0.2)'
    : isError
    ? 'rgba(255,77,77,0.2)'
    : 'rgba(168,85,247,0.2)';

  return (
    <Modal visible={true} transparent={true} animationType="none" statusBarTranslucent onRequestClose={hideToast}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              opacity,
              borderColor: borderColor,
            },
          ]}
        >
          <TouchableOpacity activeOpacity={0.9} onPress={hideToast} style={styles.toastCard}>
            <View style={[styles.iconContainer, { backgroundColor: bgBadgeColor }]}>
              {isSuccess && <CheckCircle2 color={iconColor} size={22} />}
              {(isError || isWarning) && <AlertCircle color={iconColor} size={22} />}
              {!isSuccess && !isError && !isWarning && <Info color={iconColor} size={22} />}
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.titleText}>{toast.title}</Text>
              {toast.message ? <Text style={styles.messageText}>{toast.message}</Text> : null}
            </View>

            <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
              <X color="#A1A1AA" size={18} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 30,
    left: 16,
    right: 16,
    zIndex: 999999,
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 3,
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 8,
  },
});
