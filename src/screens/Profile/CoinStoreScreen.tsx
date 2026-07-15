import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

const PACKAGES = [
  { id: '1', coins: 50, price: '$ 0.5' },
  { id: '2', coins: 120, price: '$ 1.00' },
  { id: '3', coins: 250, price: '$ 2.00' },
  { id: '4', coins: 1000, price: '$ 7.00' },
  { id: '5', coins: 1500, price: '$ 9.00' },
  { id: '6', coins: 2000, price: '$ 12.00' },
];

export default function CoinStoreScreen() {
  const navigation = useNavigation();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handlePurchase = (pkg: any) => {
    setSelectedPackage(pkg);
    setIsModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-6">
        <TouchableOpacity 
          className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-gray-400 text-[14px] ml-4 absolute left-16 top-5">Support</Text>
      </View>

      {/* Ribbon Title */}
      <View className="items-center px-5 mb-8 mt-2 relative">
        <View className="w-[300px] h-[80px] justify-center items-center">
          <Svg width="100%" height="100%" viewBox="0 0 300 80">
            {/* Left Tail */}
            <Path d="M 40 22 L 0 22 L 15 46 L 0 70 L 40 62 Z" fill="#4B1E78" />
            {/* Right Tail */}
            <Path d="M 260 22 L 300 22 L 285 46 L 300 70 L 260 62 Z" fill="#4B1E78" />
            {/* Center Piece */}
            <Path d="M 30 20 Q 150 5 270 20 L 270 60 Q 150 45 30 60 Z" fill="#752cb3" />
          </Svg>
          {/* Text Overlay */}
          <View className="absolute top-0 bottom-0 left-0 right-0 justify-center items-center pb-2">
            <Text className="text-white text-[22px] font-semibold tracking-wide">Coin store</Text>
          </View>
        </View>
      </View>

      {/* Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap justify-between px-5 pb-10">
          {PACKAGES.map((pkg) => (
            <TouchableOpacity 
              key={pkg.id} 
              className="w-[48%] bg-[#0a0a0a] border border-[#4C1D95] rounded-[24px] items-center py-6 mb-4 relative overflow-hidden"
              activeOpacity={0.8}
              onPress={() => handlePurchase(pkg)}
            >
              {/* Glowing Background Effect - approximated with absolute view */}
              <View className="absolute w-[100px] h-[100px] rounded-full bg-[#8B3DFF] opacity-30 top-1/2 left-1/2 -ml-[50px] -mt-[50px]" style={{ transform: [{ scale: 1.5 }] }} />
              
              <Text className="text-white text-[15px] font-medium mb-4">{pkg.coins} coins</Text>
              
              {/* Coin Image */}
              <Image 
                source={require('../../assets/images/utils/coins.png')} 
                className="w-16 h-16 mb-4" 
                resizeMode="contain" 
              />

              {/* Price Pill */}
              <View className="bg-[#FFB84D] px-4 py-1.5 rounded-full border border-white">
                <Text className="text-white text-[13px] font-semibold">{pkg.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 justify-center items-center bg-black/80 px-6"
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            className="w-[85%] bg-[#111] rounded-[32px] border-[3px] border-white p-8 items-center relative overflow-hidden shadow-lg shadow-black"
          >
            {/* Modal Glow */}
            <View className="absolute w-[200px] h-[200px] rounded-full bg-[#8B3DFF] opacity-20 top-1/2 left-1/2 -ml-[100px] -mt-[100px]" style={{ transform: [{ scale: 1.5 }] }} />

            <Text className="text-white text-[24px] font-semibold mb-2">Purchase</Text>
            <Text className="text-white text-[16px] mb-8">{selectedPackage?.coins} coins : {selectedPackage?.price}</Text>

            {/* Large Coin Image */}
            <Image 
              source={require('../../assets/images/utils/coins.png')} 
              className="w-32 h-32 mb-8" 
              resizeMode="contain" 
            />

            <TouchableOpacity 
              className="bg-[#FFB84D] px-8 py-3 rounded-[12px] border-2 border-white items-center"
              onPress={() => setIsModalVisible(false)}
            >
              <Text className="text-white text-[16px] font-bold px-4">Pay now</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
