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
import { tonesOf } from '../../avatar/baseCatalogue';
import { AvatarSlot } from '../../avatar/types';
import { useAssetCatalogue } from '../../avatar/useAssetCatalogue';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExploreAvatar'>;

/**
 * The Base Avatar picker: one card per character.
 *
 * The clothes on each card come from the server, as the assignments an admin
 * marked as that character's preview default. They used to be picked at random
 * from everything whose category number matched the body, which meant a card
 * could advertise a character wearing another character's clothes - the leak,
 * in its most visible form. Fetching a whole wardrobe per card to fix that
 * would be one request per card, so the defaults arrive with the characters.
 */

/** Paint order for the garments a card layers over the body. */
const PREVIEW_SLOT_ORDER: AvatarSlot[] = ['bodyColor', 'skirt', 'shoes', 'outfit', 'hair'];

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

  // No character is selected on this screen, so no wardrobe is fetched: the
  // hook's scoped query stays skipped and only the character list loads.
  const { characters } = useAssetCatalogue();

  /**
   * Artwork for the preview garments, from the character list itself.
   *
   * The hook's `artwork` lookup is the *scoped wardrobe*, and nothing is scoped
   * here - so it is empty, and reading it would silently fall back to bundled
   * art for every uploaded garment. The preview layers carry their own
   * `imageUrl`, so they are their own catalogue.
   */
  const previewArtwork: ArtworkCatalogue = useMemo(
    () =>
      Object.fromEntries(
        characters.flatMap((character) =>
          character.previewLayers.map((layer) => [
            layer.key,
            { imageUrl: layer.imageUrl, previewUrl: layer.imageUrl },
          ]),
        ),
      ),
    [characters],
  );

  /**
   * One card per character, not per body.
   *
   * A character offered in several tones is several base rows in the catalogue,
   * and listing them side by side reads as several different people. The tone
   * is chosen inside the editor instead.
   */
  const cardParts = useMemo(
    () =>
      characters
        .map((character) => {
          const [primary] = tonesOf(character);
          if (!primary) return null;

          return {
            base: primary,
            characterId: character.characterId,
            parts: [...character.previewLayers].sort(
              (a, b) =>
                PREVIEW_SLOT_ORDER.indexOf(a.slot) -
                PREVIEW_SLOT_ORDER.indexOf(b.slot),
            ),
          };
        })
        .filter((card): card is NonNullable<typeof card> => card !== null),
    [characters],
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
            // The body id is what the editor needs: it identifies the tone to
            // open on, and the character it belongs to is what scopes every
            // picker on that screen.
            baseId: base.id,
            isFullbody: base.isFullbody,
            target: base.target,
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
            card.parts.map(({ slot, key }) => {
              const art = artworkForAsset(slot, key, catalogue);
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
          {halfBodyCards.map((card, index) => renderCard(card, index, previewArtwork))}
        </View>

        {/* Full Body Section */}
        {fullBodyCards.length > 0 && (
          <>
            <View className="px-6 mb-4 mt-6">
              <Text className="text-white text-lg font-medium">Full body avatar</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24 }}>
              {fullBodyCards.map((card, index) => renderCard(card, index, previewArtwork))}
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
