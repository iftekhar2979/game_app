import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import {
  type CoinPackage,
  useGetCoinPackagesQuery,
  useReconcileOrderMutation,
  useStartTopUpIntentMutation,
} from '../../store/api/walletApi';
import { showToast } from '../../utils/toast';
import {
  describeSheetError,
  describeTopUpOutcome,
  isSettled,
  MAX_POLL_ATTEMPTS,
  nextPollDelay,
} from '../../wallet/creditPolling';

/**
 * The payment sheet, dressed as the rest of the app.
 *
 * Stripe renders the sheet natively, so this is where its palette is set -
 * the same purple, gold and near-black the store itself uses. Without it the
 * sheet arrives in Stripe's default light theme, which reads as a different
 * app opening on top of this one.
 */
const SHEET_APPEARANCE = {
  colors: {
    primary: '#8B3DFF',
    background: '#1A0B2E',
    componentBackground: '#25123F',
    componentBorder: '#4B1E78',
    componentDivider: '#4B1E78',
    primaryText: '#FFFFFF',
    secondaryText: '#C9B8E0',
    componentText: '#FFFFFF',
    placeholderText: '#7A5AA0',
    icon: '#C9B8E0',
    error: '#FF8A8A',
  },
  shapes: { borderRadius: 16, borderWidth: 1 },
  primaryButton: {
    colors: { background: '#8B3DFF', text: '#FFFFFF', border: '#8B3DFF' },
    shapes: { borderRadius: 999 },
  },
} as const;

const formatPrice = (priceAmount: number, currency: string = 'usd'): string => {
  const symbol = currency.toLowerCase() === 'usd' ? '$' : currency.toUpperCase();
  const dollars = (priceAmount / 100).toFixed(2);
  return `${symbol} ${dollars}`;
};

export default function CoinStoreScreen() {
  const navigation = useNavigation();
  const { data: packages = [], isLoading, isError, refetch } = useGetCoinPackagesQuery();
  const [startTopUpIntent] = useStartTopUpIntentMutation();
  const [reconcileOrder] = useReconcileOrderMutation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handlePurchase = (pkg: CoinPackage) => {
    setSelectedPackage(pkg);
    setIsModalVisible(true);
  };

  /**
   * Waits for the coins to land after the card is charged.
   *
   * The sheet succeeding means the money moved, not that the coins arrived -
   * that happens when Stripe's webhook reaches the server. Reconcile asks the
   * server to check with Stripe directly, so a webhook that is slow, or never
   * arrives, still ends with the user's coins credited.
   */
  const waitForCoins = async (orderId: string) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, nextPollDelay(attempt)));
      try {
        const order = await reconcileOrder({ orderId }).unwrap();
        if (isSettled(order.status)) return order;
      } catch {
        // A failed poll is not a failed payment; keep trying on schedule.
      }
    }
    return undefined;
  };

  const handlePayNow = async () => {
    if (!selectedPackage || isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const intent = await startTopUpIntent({ sku: selectedPackage.sku }).unwrap();

      // The key comes from the server with the intent rather than being baked
      // into the bundle, so rotating it or moving from test to live keys needs
      // no app release.
      await initStripe({ publishableKey: intent.publishableKey });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'CheerBattle',
        paymentIntentClientSecret: intent.clientSecret,
        appearance: SHEET_APPEARANCE as any,
        defaultBillingDetails: { name: '' },
      });
      if (initError) throw initError;

      setIsModalVisible(false);
      const { error: sheetError } = await presentPaymentSheet();
      if (sheetError) {
        // A cancellation is a decision, not a failure, and says nothing.
        const failure = describeSheetError(sheetError);
        if (failure) showToast.error(failure.title, failure.detail);
        return;
      }

      const order = await waitForCoins(intent.orderId);
      const outcome = describeTopUpOutcome(order);
      showToast[outcome.tone](outcome.title, outcome.detail);
    } catch (err: any) {
      Alert.alert(
        'Payment Failed',
        err?.data?.message || err?.message || 'Could not start the payment.',
      );
    } finally {
      setIsCheckingOut(false);
    }
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

      {/* Loading State */}
      {isLoading && (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#8B3DFF" />
          <Text className="text-gray-400 text-[14px] mt-4">Loading coin packages...</Text>
        </View>
      )}

      {/* Error State */}
      {isError && (
        <View className="flex-1 justify-center items-center py-20 px-6">
          <Text className="text-red-400 text-[15px] text-center mb-4">
            Could not load coin packages from server.
          </Text>
          <TouchableOpacity
            className="flex-row items-center bg-[#4B1E78] px-6 py-3 rounded-full"
            onPress={() => refetch()}
          >
            <RefreshCw color="#fff" size={16} />
            <Text className="text-white font-semibold ml-2">Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !isError && packages.length === 0 && (
        <View className="flex-1 justify-center items-center py-20 px-6">
          <Text className="text-gray-400 text-[15px] text-center">
            No coin packages available at the moment.
          </Text>
        </View>
      )}

      {/* Grid */}
      {!isLoading && !isError && packages.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between px-5 pb-10">
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.sku}
                className="w-[48%] bg-[#0a0a0a] border border-[#4C1D95] rounded-[24px] items-center py-6 mb-4 relative overflow-hidden"
                activeOpacity={0.8}
                onPress={() => handlePurchase(pkg)}
              >
                {/* Glowing Background Effect */}
                <View
                  className="absolute w-[100px] h-[100px] rounded-full bg-[#8B3DFF] opacity-30 top-1/2 left-1/2 -ml-[50px] -mt-[50px]"
                  style={{ transform: [{ scale: 1.5 }] }}
                />

                <Text className="text-white text-[15px] font-medium mb-1">{pkg.coins} coins</Text>
                {pkg.bonusCoins ? (
                  <Text className="text-yellow-400 text-[11px] font-bold mb-3">
                    +{pkg.bonusCoins} Bonus
                  </Text>
                ) : (
                  <View className="h-4 mb-3" />
                )}

                {/* Coin Image */}
                <Image
                  source={require('../../assets/images/utils/coins.png')}
                  className="w-16 h-16 mb-4"
                  resizeMode="contain"
                />

                {/* Price Pill */}
                <View className="bg-[#FFB84D] px-4 py-1.5 rounded-full border border-white">
                  <Text className="text-white text-[13px] font-semibold">
                    {formatPrice(pkg.priceAmount, pkg.currency)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

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
            <View
              className="absolute w-[200px] h-[200px] rounded-full bg-[#8B3DFF] opacity-20 top-1/2 left-1/2 -ml-[100px] -mt-[100px]"
              style={{ transform: [{ scale: 1.5 }] }}
            />

            <Text className="text-white text-[24px] font-semibold mb-2">Purchase</Text>
            <Text className="text-white text-[16px] mb-8">
              {selectedPackage?.coins} coins
              {selectedPackage?.bonusCoins ? ` (+${selectedPackage.bonusCoins} bonus)` : ''} :{' '}
              {selectedPackage ? formatPrice(selectedPackage.priceAmount, selectedPackage.currency) : ''}
            </Text>

            {/* Large Coin Image */}
            <Image
              source={require('../../assets/images/utils/coins.png')}
              className="w-32 h-32 mb-8"
              resizeMode="contain"
            />

            <TouchableOpacity
              className="bg-[#FFB84D] px-8 py-3 rounded-[12px] border-2 border-white items-center flex-row justify-center"
              onPress={handlePayNow}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white text-[16px] font-bold px-4">Pay now</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
