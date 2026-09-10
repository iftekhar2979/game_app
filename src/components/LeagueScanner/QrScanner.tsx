import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from 'react-native';
import { CameraOff } from 'lucide-react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { parseLeagueCode } from '../../screens/Home/leagueCode';

/**
 * A live camera that reads a league QR code.
 *
 * Replaces a button that opened the system camera app, took a photo and threw
 * it away. That flow never decoded anything, and it failed outright on Android:
 * the app declares CAMERA in its manifest, and once that permission is declared
 * it must be granted at runtime before a capture intent may be fired - which
 * nothing ever asked for.
 *
 * Permission is asked for here, when the reader has just chosen to scan, rather
 * than at launch. A prompt with an obvious reason in front of it gets granted;
 * one out of nowhere gets denied, and on Android a second denial is permanent.
 */

type PermissionState = 'checking' | 'granted' | 'denied';

interface QrScannerProps {
  /** Called once with a valid league code. */
  onCode: (code: string) => void;
  /** Called when the camera read something that is not a league code. */
  onUnrecognised?: () => void;
  size?: number;
}

export function QrScanner({ onCode, onUnrecognised, size = 230 }: QrScannerProps) {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [permission, setPermission] = useState<PermissionState>(
    hasPermission ? 'granted' : 'checking',
  );

  // One code per open. The scanner fires many times a second while the QR is
  // in frame; without this the join step would be entered over and over.
  const handled = useRef(false);
  const lastRejected = useRef<string | null>(null);

  useEffect(() => {
    if (hasPermission) {
      setPermission('granted');
      return;
    }

    let alive = true;
    requestPermission().then((granted) => {
      if (alive) setPermission(granted ? 'granted' : 'denied');
    });

    return () => {
      alive = false;
    };
  }, [hasPermission, requestPermission]);

  const onCodeScanned = useCallback(
    (codes: Array<{ value?: string }>) => {
      if (handled.current) return;

      for (const scanned of codes) {
        const code = parseLeagueCode(scanned.value);

        if (code) {
          handled.current = true;
          onCode(code);
          return;
        }

        // Report a foreign QR once, not on every frame it stays in view.
        if (scanned.value && scanned.value !== lastRejected.current) {
          lastRejected.current = scanned.value;
          onUnrecognised?.();
        }
      }
    },
    [onCode, onUnrecognised],
  );

  const codeScanner = useCodeScanner({ codeTypes: ['qr'], onCodeScanned });

  if (permission === 'checking') {
    return (
      <Frame size={size}>
        <ActivityIndicator color="#00FFFF" />
      </Frame>
    );
  }

  if (permission === 'denied') {
    return (
      <Frame size={size}>
        <CameraOff color="#00FFFF" size={40} opacity={0.6} />
        <Text className="text-white text-[13px] font-semibold mt-3 text-center">
          Camera access is off
        </Text>
        <Text className="text-gray-400 text-[11px] mt-1 text-center px-4">
          Allow camera access to scan, or type the code below.
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          className="mt-3 px-4 py-2 rounded-lg bg-[#00FFFF]"
          accessibilityRole="button"
        >
          <Text className="text-black text-xs font-bold">Open Settings</Text>
        </TouchableOpacity>
      </Frame>
    );
  }

  if (!device) {
    return (
      <Frame size={size}>
        <CameraOff color="#00FFFF" size={40} opacity={0.6} />
        <Text className="text-gray-400 text-[12px] mt-3 text-center px-4">
          No camera found on this device. Type the code below instead.
        </Text>
      </Frame>
    );
  }

  return (
    <Frame size={size}>
      <Camera
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        device={device}
        isActive
        codeScanner={codeScanner}
      />

      {/* Corner brackets over the live preview. */}
      <View className="absolute top-2 left-2 w-7 h-7 border-t-2 border-l-2 border-[#00FFFF] rounded-tl-lg" />
      <View className="absolute top-2 right-2 w-7 h-7 border-t-2 border-r-2 border-[#00FFFF] rounded-tr-lg" />
      <View className="absolute bottom-2 left-2 w-7 h-7 border-b-2 border-l-2 border-[#00FFFF] rounded-bl-lg" />
      <View className="absolute bottom-2 right-2 w-7 h-7 border-b-2 border-r-2 border-[#00FFFF] rounded-br-lg" />
    </Frame>
  );
}

function Frame({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View
      style={{ width: size, height: size }}
      className="rounded-3xl bg-[#0a0a0a] border border-[#00FFFF]/40 overflow-hidden justify-center items-center mb-4"
    >
      {children}
    </View>
  );
}
