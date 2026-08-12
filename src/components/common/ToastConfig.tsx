import React from 'react';
import { View, Text } from 'react-native';
interface BaseToastProps {
  text1?: string;
  text2?: string;
}
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

export const toastConfig = {
  success: ({ text1, text2 }: BaseToastProps) => (
    <View className="w-[90%] bg-[#121212] border border-[#00E676]/40 rounded-2xl p-4 flex-row items-center shadow-lg shadow-[#00E676]/20">
      <View className="w-10 h-10 rounded-full bg-[#00E676]/10 justify-center items-center mr-3">
        <CheckCircle2 color="#00E676" size={22} />
      </View>
      <View className="flex-1">
        {text1 ? <Text className="text-white font-semibold text-base mb-0.5">{text1}</Text> : null}
        {text2 ? <Text className="text-[#A1A1AA] text-sm">{text2}</Text> : null}
      </View>
    </View>
  ),

  error: ({ text1, text2 }: BaseToastProps) => (
    <View className="w-[90%] bg-[#121212] border border-[#FF4D4D]/40 rounded-2xl p-4 flex-row items-center shadow-lg shadow-[#FF4D4D]/20">
      <View className="w-10 h-10 rounded-full bg-[#FF4D4D]/10 justify-center items-center mr-3">
        <AlertCircle color="#FF4D4D" size={22} />
      </View>
      <View className="flex-1">
        {text1 ? <Text className="text-white font-semibold text-base mb-0.5">{text1}</Text> : null}
        {text2 ? <Text className="text-[#A1A1AA] text-sm">{text2}</Text> : null}
      </View>
    </View>
  ),

  info: ({ text1, text2 }: BaseToastProps) => (
    <View className="w-[90%] bg-[#121212] border border-[#B366FF]/40 rounded-2xl p-4 flex-row items-center shadow-lg shadow-[#B366FF]/20">
      <View className="w-10 h-10 rounded-full bg-[#B366FF]/10 justify-center items-center mr-3">
        <Info color="#B366FF" size={22} />
      </View>
      <View className="flex-1">
        {text1 ? <Text className="text-white font-semibold text-base mb-0.5">{text1}</Text> : null}
        {text2 ? <Text className="text-[#A1A1AA] text-sm">{text2}</Text> : null}
      </View>
    </View>
  ),
};
