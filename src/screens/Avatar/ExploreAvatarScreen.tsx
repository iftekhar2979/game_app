import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Edit2 } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { authService } from '../../services/authService';
import { ArtworkCatalogue, artworkForAsset, artworkForBase } from '../../avatar/assetSource';
import ArtworkImage from '../../components/Avatar/ArtworkImage';
import { resolveParts } from '../../avatar/partCatalogue';
import { resolveBases, type CatalogueAssets } from '../../avatar/baseCatalogue';
import { AvatarBase, AvatarSlot } from '../../avatar/types';
import { useAssetCatalogue } from '../../avatar/useAssetCatalogue';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExploreAvatar'>;

/**
 * Every list here comes from `avatar/registry`.
 *
 * This screen used to carry its own copy of the skirt, shoe, outfit and hair
 * arrays - the same duplication `GenerateAvatarScreen` had - which meant the
 * card previews were bundled `require()` handles and could never show uploaded
 * artwork. Reading the registry is what connects them to the catalogue.
 */

/** The slots a card layers on top of the body, in paint order. */
const PREVIEW_SLOTS: AvatarSlot[] = ['skirt', 'shoes', 'outfit', 'hair'];

const randomIdFor = (
  slot: AvatarSlot,
  base: AvatarBase,
  assets?: CatalogueAssets | null,
): string | null => {
  const options = resolveParts(slot, base.target, base.category, assets);
  if (!options.length) return null;

  return options[Math.floor(Math.random() * options.length)].id;
};

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.floor((width - 48 - 24) / 3); // 48 for screen padding (px-6 is 24*2), 24 for gaps (12*2)
const HALF_BODY_CARD_HEIGHT = CARD_WIDTH * 1.3;
const FULL_BODY_CARD_HEIGHT = CARD_WIDTH * 1.9;


const ExploreAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<RootStackParamList, 'ExploreAvatar'>>();
  const insets = useSafeAreaInsets();
  const returnTo = route.params?.returnTo;
  const isAccountSetup = route.params?.isAccountSetup === true;

  const { artwork, assets } = useAssetCatalogue();

  // Catalogue first, bundle as the fallback: a base added in the dashboard
  // appears here with no app release, and an unreachable catalogue still lists
  // everything the app ships with.
  const bases = useMemo(() => resolveBases(assets), [assets]);

  /**
   * Which parts each card wears, chosen once per mount.
   *
   * Only the *ids* are randomised here; the artwork for them is resolved during
   * render. Randomising the resolved sources instead would reshuffle every card
   * the moment the catalogue arrived, so a card the user was already looking at
   * would silently change clothes.
   */
  const cardParts = useMemo(
    () =>
      bases.map((base) => ({
        base,
        parts: PREVIEW_SLOTS.map((slot) => ({
          slot,
          assetId: randomIdFor(slot, base, assets),
        })),
      })),
    [bases, assets],
  );

  const renderCard = (
    card: (typeof cardParts)[number],
    index: number,
    catalogue: ArtworkCatalogue,
  ) => {
    const { base } = card;
    const bodyArt = artworkForBase(base.id, catalogue);

    return (
      <TouchableOpacity
        key={base.id}
        activeOpacity={0.8}
        style={{
          width: CARD_WIDTH,
          height: base.isFullbody ? FULL_BODY_CARD_HEIGHT : HALF_BODY_CARD_HEIGHT,
          marginBottom: 12,
          marginRight: index % 3 !== 2 ? 12 : 0,
        }}
        onPress={() =>
          navigation.navigate('GenerateAvatar', {
            // The id is what identifies the base now. Target and category are
            // still sent so the editor works unchanged for anything that
            // navigates here without one.
            baseId: base.id,
            isFullbody: base.isFullbody,
            target: base.target,
            avatarCategory: base.category,
            returnTo,
            isAccountSetup,
          })
        }
      >
        <View className="flex-1 rounded-2xl border-2 border-[#5B1F7D] overflow-hidden bg-[#1A0B2E]">
          <ArtworkImage
            source={bodyArt.source ?? base.source}
            fallback={base.source}
            className={
              base.isFullbody
                ? 'absolute w-full h-full scale-[2.6] mt-4'
                : 'absolute w-full h-full'
            }
            resizeMode={base.isFullbody ? 'contain' : 'cover'}
          />

          {base.isFullbody &&
            card.parts.map(({ slot, assetId }) => {
              const art = artworkForAsset(slot, assetId, catalogue);
              // A slot with no artwork anywhere is simply not layered on.
              if (!art.source && !art.fallback) return null;

              return (
                <ArtworkImage
                  key={slot}
                  source={art.source}
                  fallback={art.fallback}
                  className="absolute w-full h-full scale-[2.6] mt-4"
                  resizeMode="contain"
                />
              );
            })}

          {/* Decorative team initials like in the mock */}
          <View className="absolute bottom-2 w-full items-center z-10">
            <Text className="text-white font-bold italic opacity-80 text-xs shadow-lg">CB</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const halfBodyCards = cardParts.filter((card) => !card.base.isFullbody);
  const fullBodyCards = cardParts.filter((card) => card.base.isFullbody);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View className="px-6 flex-row items-center mb-8">
        <TouchableOpacity
          onPress={() => isAccountSetup
            ? authService.handleLogout(dispatch as any)
            : navigation.goBack()
          }
          className="w-10 h-10 border border-[#3A144E] rounded-xl items-center justify-center bg-black/40 mr-4"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl text-[#B366FF] font-semibold tracking-wide">Explore avatar</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Section Title */}
        {/* <View className="px-6 mb-4">
          <Text className="text-white text-lg font-medium">Half body avatar</Text>
        </View> */}

        {/* Grid List - Half Body */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24 }}>
          {halfBodyCards.map((card, index) => renderCard(card, index, artwork))}
        </View>

        {/* Full Body Section */}
        {fullBodyCards.length > 0 && (
          <>
            <View className="px-6 mb-4 mt-6">
              <Text className="text-white text-lg font-medium">Full body avatar</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24 }}>
              {fullBodyCards.map((card, index) => renderCard(card, index, artwork))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-black border border-[#5B1F7D] items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Edit2 color="#FFB444" size={24} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0318', // Very dark purple/black base
  },
});

export default ExploreAvatarScreen;
