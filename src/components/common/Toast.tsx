import React, { useEffect, useState, useRef } from 'react';
import { Animated, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
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
          toValue: 50,
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
      }, options.duration || 4000);
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
  const isError = toast.type === 'error';

  const borderColor = isSuccess ? '#00E676' : isError ? '#FF4D4D' : '#B366FF';
  const iconColor = isSuccess ? '#00E676' : isError ? '#FF4D4D' : '#B366FF';
  const bgBadgeColor = isSuccess ? 'rgba(0,230,118,0.15)' : isError ? 'rgba(255,77,77,0.15)' : 'rgba(179,102,255,0.15)';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          borderColor: borderColor,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hideToast} style={styles.toastCard}>
        <View style={[styles.iconContainer, { backgroundColor: bgBadgeColor }]}>
          {isSuccess && <CheckCircle2 color={iconColor} size={22} />}
          {isError && <AlertCircle color={iconColor} size={22} />}
          {!isSuccess && !isError && <Info color={iconColor} size={22} />}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{toast.title}</Text>
          {toast.message ? <Text style={styles.messageText}>{toast.message}</Text> : null}
        </View>

        <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
          <X color="#999" size={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 99999,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  messageText: {
    color: '#A1A1AA',
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
