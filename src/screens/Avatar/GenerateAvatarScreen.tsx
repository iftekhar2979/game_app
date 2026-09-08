import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Dimensions, Animated, Alert } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import ViewShot from 'react-native-view-shot';
import { RootStackParamList } from '../../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLazyGetPreSignedUrlQuery } from '../../store/api/usersApi';
import { useSaveAvatarMutation } from '../../store/api/avatarApi';
import { usePurchaseAvatarAssetMutation } from '../../store/api/avatarAssetsApi';
import { describePurchaseError } from '../../store/api/avatarAssetsTransforms';
import { useAssetCatalogue } from '../../avatar/useAssetCatalogue';
import AssetPickerTile from '../../components/Avatar/AssetPickerTile';
import NoneOptionTile from '../../components/Avatar/NoneOptionTile';
import { uploadImage } from '../../services/mediaUpload';
import { authStorage } from '../../services/authStorage';
import { authService } from '../../services/authService';
import { showToast } from '../../utils/toast';
import {
  BASES,
  FULLBODY_STAGE_SCALE,
  HAIR_COLORS,
  REGISTRY_VERSION,
  getEyeSource,
} from '../../avatar/registry';
import {
  ArtworkWithFallback,
  artworkForAsset,
  artworkForBase,
  previewArtworkForAsset,
} from '../../avatar/assetSource';
import ArtworkImage from '../../components/Avatar/ArtworkImage';
import { resolveConfig } from '../../avatar/resolveConfig';
import { prefetchEditorArtwork, prefetchSources } from '../../avatar/prefetchArtwork';
import { AvatarAsset, AvatarConfig, AvatarSlot } from '../../avatar/types';
import { hexToTintMatrix } from '../../avatar/hairTint';
import { blinkSourcesFor, resolveBases } from '../../avatar/baseCatalogue';
import { resolveParts } from '../../avatar/partCatalogue';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'GenerateAvatar'>;
type GenerateAvatarRouteProp = RouteProp<RootStackParamList, 'GenerateAvatar'>;

const { height } = Dimensions.get('window');
const PREVIEW_HEIGHT = 320;
const FULLBODY_PREVIEW_HEIGHT = Math.min(560, height * 0.68);


/**
 * Every part list on this screen comes from `avatar/registry`.
 *
 * These arrays used to be duplicated here verbatim - and the hair and outfit
 * lists twice over, as separate half-body and full-body copies - which meant
 * the registry was the source of truth for *ids* while the screen kept its own
 * source of truth for *artwork*. The two had to stay in the same order or
 * `idAt` below would save the wrong part, and only a test was holding that
 * line.
 *
 * The practical cost was that these copies were bundled `require()` handles, so
 * the pickers could never show uploaded artwork no matter what the catalogue
 * said. Going through the registry is what connects them to it.
 */

const GenerateAvatarScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GenerateAvatarRouteProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const viewShotRef = useRef<any>(null);

  const [saveAvatarToServer, { isLoading: isUpdating }] = useSaveAvatarMutation();
  const [getPreSignedUrl] = useLazyGetPreSignedUrlQuery();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * The backend decides what may be picked; the bundled registry still decides
   * what gets drawn. A catalogue failure therefore degrades selection only -
   * every preview on this screen keeps rendering.
   */
  const catalogue = useAssetCatalogue();
  const [purchaseAsset] = usePurchaseAvatarAssetMutation();
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);
  // Strips the preview chrome for the one frame that gets captured.
  const [isCapturing, setIsCapturing] = useState(false);

  const target = route.params?.target || 'female';
  const avatarCategory = route.params?.avatarCategory || 1;

  /**
   * `resolveParts` already filters by target and category, which is what the seven
   * hand-written filters here used to do. Half-body and full-body draw the same
   * hair and outfit lists - they always did, the screen just held two copies.
   */
  /**
   * Options per slot, catalogue included.
   *
   * Memoised on the catalogue so the array identity is stable within a render:
   * the pickers hold indices into these lists and `idAt`/`seed` invert them, so
   * they have to be the very same list or an index would resolve to a garment
   * other than the one on screen.
   */
  const optionsFor = useMemo(() => {
    const cache: Partial<Record<AvatarSlot, ReturnType<typeof resolveParts>>> = {};
    return (slot: AvatarSlot, t = target, c = avatarCategory) => {
      const key = `${slot}:${t}:${c}` as AvatarSlot;
      if (!cache[key]) cache[key] = resolveParts(slot, t, c, catalogue.assets);
      return cache[key]!;
    };
  }, [catalogue.assets, target, avatarCategory]);

  const HAIR_STYLES = optionsFor('hair');
  const BLAZERS = optionsFor('outfit');
  const FULLBODY_HAIR = HAIR_STYLES;
  const FULLBODY_OUTFITS = BLAZERS;
  const FULLBODY_SKIRTS = optionsFor('skirt');
  const SHOES = optionsFor('shoes');
  const BODY_COLORS = optionsFor('bodyColor');

  const isFullbody = route.params?.isFullbody === true;

  /**
   * The base this look is built on.
   *
   * By id when the caller sent one, which is the only thing that identifies a
   * base once two can share a category - a dashboard-created base is free to
   * reuse an existing one. Target + category remain the fallback so anything
   * that navigates here without an id behaves exactly as before.
   *
   * Never the `require()` handle: the saved config stores a stable id, not a
   * bundler-assigned number.
   */
  const activeBase = useMemo(() => {
    const bases = resolveBases(catalogue.assets);
    const byId = route.params?.baseId
      ? bases.find((b) => b.id === route.params?.baseId)
      : undefined;
    return (
      byId ?? bases.find((b) => b.target === target && b.category === avatarCategory)
    );
  }, [catalogue.assets, route.params?.baseId, target, avatarCategory]);

  /**
   * The pickers still hold indices into their filtered lists; the registry
   * preserves that same order, so an index maps back to a stable asset id here.
   * Only ids are ever persisted - an index would silently point at different
   * artwork as soon as any asset is added or reordered.
   */
  const idAt = (slot: AvatarSlot, index: number | null): string | null => {
    if (index === null || index === undefined || !activeBase) return null;
    const options = optionsFor(slot, activeBase.target, activeBase.category);
    return options[index]?.id ?? null;
  };

  /**
   * Artwork for a picker index, uploaded where the catalogue has any.
   *
   * `layerArtwork` feeds the preview stage and needs the full-resolution image;
   * `tileArtwork` feeds the 72px picker tiles and prefers the smaller preview,
   * because a layer PNG is painted on a full-body canvas and the bases run to
   * half a megabyte each.
   */
  const layerArtwork = (slot: AvatarSlot, index: number | null): ArtworkWithFallback =>
    artworkForAsset(slot, idAt(slot, index), catalogue.artwork);

  const tileArtwork = (
    slot: AvatarSlot,
    index: number,
    asset: AvatarAsset,
  ): ArtworkWithFallback => {
    const artwork = previewArtworkForAsset(slot, idAt(slot, index), catalogue.artwork);
    return { source: artwork.source ?? asset.source, fallback: artwork.fallback ?? asset.source };
  };

  /** The body itself, resolved by the same rule as every other layer. */
  const baseArtwork = artworkForBase(activeBase?.id, catalogue.artwork);
  const baseImage: ArtworkWithFallback = {
    source: baseArtwork.source ?? activeBase?.source ?? BASES[0].source,
    fallback: baseArtwork.fallback ?? activeBase?.source ?? BASES[0].source,
  };

  /**
   * Edit mode. Present when the wardrobe reopened a saved look; absent when
   * Explore started a new one, which leaves every seed below on its default.
   */
  const savedConfig = route.params?.config ?? null;

  /**
   * The picker index for a saved part — the exact inverse of `idAt` above, so a
   * config that round-trips through the editor comes back unchanged.
   *
   * A slot the user deliberately left empty stays empty, and a part whose art
   * has since been retired resolves to `null` rather than to whatever now sits
   * at that index.
   */
  const seed = (slot: AvatarSlot, fallback: number | null): number | null => {
    if (!savedConfig || !activeBase) return fallback;
    // Inverted against the same merged list the pickers render, so a saved
    // part that came from the catalogue seeds correctly too.
    const savedId = savedConfig.parts?.[slot];
    if (!savedId) return null;
    const index = optionsFor(slot, activeBase.target, activeBase.category).findIndex(
      (asset) => asset.id === savedId,
    );
    return index >= 0 ? index : null;
  };

  /**
   * Buys a locked asset. The backend debits the coins inside a transaction and
   * writes the entitlement; the client never touches the balance itself.
   *
   * `purchasingKey` is what prevents a double tap becoming two requests - the
   * tile is disabled for the duration, and the mutation is only ever in flight
   * for one asset at a time.
   */
  const handlePurchase = async (slot: AvatarSlot, index: number) => {
    const key = idAt(slot, index);
    if (!key || purchasingKey) return;

    try {
      setPurchasingKey(key);
      await purchaseAsset(key).unwrap();
      // Invalidating the catalogue tag re-fetches ownership, so the tile
      // becomes selectable without any local guess about what changed.
      showToast.success('Unlocked', 'You can use it now.');
    } catch (error: any) {
      const failure = describePurchaseError(error);
      if (failure.canTopUp) {
        // A shortfall is the one failure the user can act on immediately, so
        // offer the coin store instead of leaving them to find it themselves.
        Alert.alert(failure.title, failure.detail, [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Buy coins',
            onPress: () => navigation.navigate('CoinStore'),
          },
        ]);
      } else {
        showToast[failure.tone](failure.title, failure.detail);
      }
    } finally {
      setPurchasingKey(null);
    }
  };

  /** Says why a tap did nothing, for assets that cannot simply be bought. */
  const explainBlocked = (slot: AvatarSlot, index: number) => {
    const availability = catalogue.stateOf(idAt(slot, index)).availability;

    if (availability === 'retired') {
      showToast.info(
        'No longer available',
        'This part has been retired. Avatars already wearing it still show it.',
      );
    } else if (availability === 'unknown') {
      showToast.warning(
        'Cannot check availability',
        'The asset catalogue is unreachable. Pull to retry.',
      );
    }
  };

  const buildConfig = (): AvatarConfig => ({
    version: REGISTRY_VERSION,
    base: activeBase!.id,
    parts: {
      bodyColor: idAt('bodyColor', selectedBodyColor),
      skirt: idAt('skirt', isFullbody ? selectedFullbodySkirt : null),
      shoes: idAt('shoes', isFullbody ? selectedShoes : null),
      outfit: idAt('outfit', isFullbody ? selectedFullbodyOutfit : selectedBody),
      hair: idAt('hair', isFullbody ? selectedFullbodyHair : selectedHair),
    },
    hairColor: selectedHairColor,
  });
  const previewHeight = isFullbody ? FULLBODY_PREVIEW_HEIGHT : PREVIEW_HEIGHT;

  /**
   * Warm every part offered for this base as soon as the catalogue lands.
   *
   * Without this the pickers fill in one remote image at a time as the user
   * scrolls. A failure here is not worth reporting - the artwork still loads on
   * demand, just visibly - so the outcome is deliberately ignored.
   */
  useEffect(() => {
    if (!activeBase || catalogue.isLoading) return;

    prefetchEditorArtwork(
      activeBase.target,
      activeBase.category,
      activeBase.id,
      catalogue.artwork,
    ).catch(() => undefined);
  }, [activeBase, catalogue.artwork, catalogue.isLoading]);

  /**
   * Blink overlays.
   *
   * A body uploaded through the dashboard carries its own closed-eye artwork,
   * because the bundled overlays are drawn for the five shipped silhouettes and
   * would not sit correctly on anything else. Without one it falls back to
   * those; with blinking turned off it draws neither.
   */
  const blink = activeBase ? blinkSourcesFor(activeBase) : null;
  const halfClosedEyeSource =
    blink?.blink ?? getEyeSource('half', target, avatarCategory);
  const fullClosedEyeSource =
    blink?.blink ?? getEyeSource('full', target, avatarCategory);

  // Every picker is seeded in its useState initializer, so edit mode's first
  // paint is already the saved look. Hydrating in an effect instead would flash
  // the defaults for a frame and would clobber a fast first tap.

  // Shared state
  const [selectedHairColor, setSelectedHairColor] = useState<string | null>(
    () => savedConfig?.hairColor ?? null,
  );
  const [selectedBodyColor, setSelectedBodyColor] = useState<number | null>(
    () => seed('bodyColor', avatarCategory === 1 ? 0 : null),
  );

  // Half body state
  const [selectedHair, setSelectedHair] = useState<number | null>(
    () => (!isFullbody ? seed('hair', 0) : null),
  );
  const [selectedBody, setSelectedBody] = useState<number | null>(
    () => (!isFullbody ? seed('outfit', 0) : null),
  );

  // Full body state
  const [selectedFullbodyHair, setSelectedFullbodyHair] = useState<number | null>(
    () => (isFullbody ? seed('hair', 0) : null),
  );
  const [selectedFullbodySkirt, setSelectedFullbodySkirt] = useState<number | null>(
    () => (isFullbody ? seed('skirt', 0) : null),
  );
  const [selectedFullbodyOutfit, setSelectedFullbodyOutfit] = useState<number | null>(
    () => (isFullbody ? seed('outfit', 0) : null),
  );
  const [selectedShoes, setSelectedShoes] = useState<number | null>(
    () => (isFullbody ? seed('shoes', 0) : null),
  );

  // Eye Animation State
  const [eyeState, setEyeState] = useState<'open' | 'half_closed' | 'closed'>('open');

  useEffect(() => {
    // A body with blinking turned off stays open-eyed rather than running a
    // timer whose overlays are never drawn.
    if (!blink) {
      setEyeState('open');
      return;
    }

    const blinkInterval = setInterval(() => {
      setEyeState('half_closed'); // Starts at 0ms
      setTimeout(() => setEyeState('closed'), 150); // Happens at 150ms
      setTimeout(() => setEyeState('half_closed'), 300); // Happens at 300ms
      setTimeout(() => setEyeState('open'), 450); // Happens at 450ms
    }, 3000); // Every 3 seconds

    return () => clearInterval(blinkInterval);
  }, [blink]);

  // Breathing Animation State
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1, // Inhale
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0, // Exhale
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [breatheAnim]);

  const breatheScaleY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.010],
  });

  const breatheScaleX = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.008],
  });

  /**
   * The look's layers, resolved once per render.
   *
   * `null` means nothing anywhere can draw that slot - no upload, and no
   * bundled art under that id - so the layer is skipped. Gating the JSX on the
   * artwork rather than on the picker index is what makes that degradation
   * automatic: a part that cannot be drawn simply is not drawn, instead of
   * rendering as a broken image over the body.
   */
  const bodyColorArt = layerArtwork('bodyColor', selectedBodyColor);
  const halfOutfitArt = layerArtwork('outfit', isFullbody ? null : selectedBody);
  const halfHairArt = layerArtwork('hair', isFullbody ? null : selectedHair);
  const fullSkirtArt = layerArtwork('skirt', isFullbody ? selectedFullbodySkirt : null);
  const fullShoesArt = layerArtwork('shoes', isFullbody ? selectedShoes : null);
  const fullOutfitArt = layerArtwork('outfit', isFullbody ? selectedFullbodyOutfit : null);
  const fullHairArt = layerArtwork('hair', isFullbody ? selectedFullbodyHair : null);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View className="flex-row items-center px-6 mb-8 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-[#1A0B2E] items-center justify-center border border-[#5B1F7D]"
          activeOpacity={0.8}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-medium ml-4">Customize Avatar</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Large Avatar Preview */}
        <View className="px-6 mb-8">
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          >
            <View
              style={[
                styles.previewContainer,
                { height: previewHeight },
                // Chrome is stripped for the capture frame only, so the saved
                // PNG is the character on transparency rather than an opaque
                // dark card that shows as corners in a circular frame.
                isCapturing && styles.capturingContainer,
              ]}
            >
              {!isCapturing && (
                <View className="absolute top-10 w-48 h-48 rounded-full bg-[#B366FF] opacity-20 blur-3xl" />
              )}

              <Animated.View
                style={[
                  isFullbody ? styles.fullbodyStage : styles.avatarStage,
                  {
                  transform: [
                    { scaleX: breatheScaleX },
                    { scaleY: breatheScaleY },
                    ...(isFullbody ? [{ scale: FULLBODY_STAGE_SCALE }] : []),
                  ],
                  transformOrigin: 'bottom center' as any,
                }
                ]}
              >
                {/* Base Head / Base Body */}
                <ArtworkImage
                  source={baseImage.source}
                  fallback={baseImage.fallback}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />

                {/* Body Color Layer (Conditional for avatarCategory === 1) */}
                {avatarCategory === 1 && bodyColorArt.source && (
                  <ArtworkImage
                    source={bodyColorArt.source}
                    fallback={bodyColorArt.fallback}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}

                {/* Eye Blinking Animation Overlay - Opacity toggled to prevent load lag */}
                <Image
                  source={halfClosedEyeSource}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                  style={{ opacity: eyeState === 'half_closed' ? 1 : 0 }}
                />
                <Image
                  source={fullClosedEyeSource}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                  style={{ opacity: eyeState === 'closed' ? 1 : 0 }}
                />

                {/* --- HALF BODY LAYERS --- */}
                {!isFullbody && halfOutfitArt.source && (
                  <ArtworkImage
                    source={halfOutfitArt.source}
                    fallback={halfOutfitArt.fallback}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}

                {!isFullbody && halfHairArt.source && (
                  <View className="absolute w-full h-full scale-[1.03] top-[-1%]">
                    {selectedHairColor ? (
                      <Svg width="100%" height="100%">
                        <Defs>
                          <Filter id="hairColorFilter">
                            <FeColorMatrix
                              type="matrix"
                              values={hexToTintMatrix(selectedHairColor)}
                            />
                          </Filter>
                        </Defs>
                        <SvgImage
                          width="100%"
                          height="100%"
                          preserveAspectRatio="xMidYMid meet"
                          href={halfHairArt.source ?? halfHairArt.fallback}
                          filter="url(#hairColorFilter)"
                        />
                      </Svg>
                    ) : (
                      <ArtworkImage
                        source={halfHairArt.source}
                        fallback={halfHairArt.fallback}
                        className="absolute w-full h-full"
                        resizeMode="contain"
                      />
                    )}
                  </View>
                )}

                {/* --- FULL BODY LAYERS --- */}
                {isFullbody && fullSkirtArt.source && (
                  <ArtworkImage
                    source={fullSkirtArt.source}
                    fallback={fullSkirtArt.fallback}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}

                {isFullbody && fullShoesArt.source && (
                  <ArtworkImage
                    source={fullShoesArt.source}
                    fallback={fullShoesArt.fallback}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}

                {isFullbody && fullOutfitArt.source && (
                  <ArtworkImage
                    source={fullOutfitArt.source}
                    fallback={fullOutfitArt.fallback}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}



                {isFullbody && fullHairArt.source && (
                  <View className="absolute w-full h-full">
                    {selectedHairColor ? (
                      <Svg width="100%" height="100%">
                        <Defs>
                          <Filter id="fullbodyHairColorFilter">
                            <FeColorMatrix
                              type="matrix"
                              values={hexToTintMatrix(selectedHairColor)}
                            />
                          </Filter>
                        </Defs>
                        <SvgImage
                          width="100%"
                          height="100%"
                          preserveAspectRatio="xMidYMid meet"
                          href={fullHairArt.source ?? fullHairArt.fallback}
                          filter="url(#fullbodyHairColorFilter)"
                        />
                      </Svg>
                    ) : (
                      <ArtworkImage
                        source={fullHairArt.source}
                        fallback={fullHairArt.fallback}
                        className="absolute w-full h-full"
                        resizeMode="contain"
                      />
                    )}
                  </View>
                )}

              </Animated.View>

              {/* Gradient Overlay to hide edge artifacts */}
              {!isCapturing && (
              <View className="absolute bottom-0 w-full h-24 pointer-events-none">
                <Svg height="100%" width="100%">
                  <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#1A0B2E" stopOpacity="0" />
                      <Stop offset="1" stopColor="#1A0B2E" stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#grad)" />
                </Svg>
              </View>
              )}
            </View>
          </ViewShot>
        </View>

        {/*
          A catalogue failure is stated rather than papered over: the avatar
          above still renders from the bundle, but we genuinely do not know what
          the user owns, and guessing would either hide their own parts or
          invite a save the backend rejects.
        */}
        {catalogue.isUnavailable && (
          <View className="mx-6 mb-6 px-4 py-3 rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white text-[13px] font-semibold">Parts unavailable</Text>
              <Text className="text-gray-400 text-[11px] mt-0.5">
                Could not load the asset catalogue, so nothing new can be selected.
              </Text>
            </View>
            <TouchableOpacity
              className="px-3 py-1.5 rounded-full border border-[#B366FF]"
              onPress={() => catalogue.refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading avatar assets"
            >
              <Text className="text-[#B366FF] text-[11px] font-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customization Sections */}
        {!isFullbody ? (
          <>
            {/* Hair Style */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Hair style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {HAIR_STYLES.map((hair, index) => (
                  <TouchableOpacity
                    key={`hair-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHair(index)}
                  >
                    <View className="w-[72px] h-[90px] rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden justify-end pb-6">
                      <ArtworkImage
                        source={tileArtwork('hair', index, hair).source}
                        fallback={tileArtwork('hair', index, hair).fallback}
                        className="w-[180%] h-[180%] absolute top-[-40%] left-[-40%]"
                        resizeMode="cover"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Hair Color */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Hair color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {HAIR_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={`color-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHairColor(color)}
                  >
                    <View
                      className={`w-[60px] h-[60px] rounded-full mb-3 border-2 ${selectedHairColor === color ? 'border-white' : 'border-[#5B1F7D]'}`}
                      style={{ backgroundColor: color }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Blazer */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Blazer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {BLAZERS.map((blazer, index) => (
                  <TouchableOpacity
                    key={`blazer-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center opacity-80"
                    onPress={() => setSelectedBody(index)}
                  >
                    <View className="w-[72px] h-[90px] rounded-xl border border-[#3A144E] bg-black/40 overflow-hidden justify-center items-center pb-4">
                      <ArtworkImage
                        source={tileArtwork('outfit', index, blazer).source}
                        fallback={tileArtwork('outfit', index, blazer).fallback}
                        className="w-[50%] h-[50%]"
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Body Color (Half Body) */}
            {BODY_COLORS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Skin tone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {/* Clearing a tone is a choice of its own, not a second tap
                      on the one you already picked. */}
                  <NoneOptionTile
                    isSelected={selectedBodyColor === null}
                    onSelect={() => setSelectedBodyColor(null)}
                    accessibilityLabel="No skin tone overlay"
                  />
                  {BODY_COLORS.map((bodyColor, index) => {
                    const assetKey = idAt('bodyColor', index);
                    return (
                      <AssetPickerTile
                        key={`fb-body-color-${assetKey ?? index}`}
                        source={tileArtwork('bodyColor', index, bodyColor).source}
                        imageClassName="w-full h-full"
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedBodyColor === index}
                        onSelect={() => setSelectedBodyColor(index)}
                        onPurchase={() => handlePurchase('bodyColor', index)}
                        onBlocked={() => explainBlocked('bodyColor', index)}
                        isPurchasing={purchasingKey !== null && purchasingKey === assetKey}
                        accessibilityLabel="Skin tone"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Full Body Hair Style */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Full Body Hair</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {FULLBODY_HAIR.map((hair, index) => {
                  const assetKey = idAt('hair', index);
                  return (
                    <AssetPickerTile
                      key={`fb-hair-${assetKey ?? index}`}
                      source={tileArtwork('hair', index, hair).source}
                      imageClassName="w-[250%] h-[250%] absolute top-[-10%]"
                      state={catalogue.stateOf(assetKey)}
                      isSelected={selectedFullbodyHair === index}
                      onSelect={() => setSelectedFullbodyHair(index)}
                      onPurchase={() => handlePurchase('hair', index)}
                      onBlocked={() => explainBlocked('hair', index)}
                      isPurchasing={purchasingKey !== null && purchasingKey === assetKey}
                      accessibilityLabel="Hair style"
                    />
                  );
                })}
              </ScrollView>
            </View>

            {/* Hair Color (Shared) */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Hair color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {HAIR_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={`fb-color-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHairColor(color)}
                  >
                    <View
                      className={`w-[60px] h-[60px] rounded-full mb-3 border-2 ${selectedHairColor === color ? 'border-white' : 'border-[#5B1F7D]'}`}
                      style={{ backgroundColor: color }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Skin tone (Full Body) */}
            {BODY_COLORS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Skin tone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {/* Clearing a tone is a choice of its own, not a second tap
                      on the one you already picked. */}
                  <NoneOptionTile
                    isSelected={selectedBodyColor === null}
                    onSelect={() => setSelectedBodyColor(null)}
                    accessibilityLabel="No skin tone overlay"
                  />
                  {BODY_COLORS.map((bodyColor, index) => {
                    const assetKey = idAt('bodyColor', index);
                    return (
                      <AssetPickerTile
                        key={`fb-body-color-${assetKey ?? index}`}
                        source={tileArtwork('bodyColor', index, bodyColor).source}
                        imageClassName="w-full h-full"
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedBodyColor === index}
                        onSelect={() => setSelectedBodyColor(index)}
                        onPurchase={() => handlePurchase('bodyColor', index)}
                        onBlocked={() => explainBlocked('bodyColor', index)}
                        isPurchasing={purchasingKey !== null && purchasingKey === assetKey}
                        accessibilityLabel="Skin tone"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">Skirt</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {FULLBODY_SKIRTS.map((skirt, index) => {
                  const assetKey = idAt('skirt', index);
                  return (
                    <AssetPickerTile
                      key={`fb-skirt-${assetKey ?? index}`}
                      source={tileArtwork('skirt', index, skirt).source}
                      imageClassName="w-[220%] h-[220%] absolute top-[-40%]"
                      state={catalogue.stateOf(assetKey)}
                      isSelected={selectedFullbodySkirt === index}
                      onSelect={() => setSelectedFullbodySkirt(index)}
                      onPurchase={() => handlePurchase('skirt', index)}
                      onBlocked={() => explainBlocked('skirt', index)}
                      isPurchasing={purchasingKey !== null && purchasingKey === assetKey}
                      accessibilityLabel="Skirt"
                    />
                  );
                })}
              </ScrollView>
            </View>

            {FULLBODY_OUTFITS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Full Body Outfit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {FULLBODY_OUTFITS.map((outfit, index) => {
                    const assetKey = idAt('outfit', index);
                    return (
                      <AssetPickerTile
                        key={`fb-outfit-${assetKey ?? index}`}
                        source={tileArtwork('outfit', index, outfit).source}
                        imageClassName="w-[220%] h-[220%] absolute top-[-25%]"
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedFullbodyOutfit === index}
                        onSelect={() => setSelectedFullbodyOutfit(index)}
                        onPurchase={() => handlePurchase('outfit', index)}
                        onBlocked={() => explainBlocked('outfit', index)}
                        isPurchasing={purchasingKey !== null && purchasingKey === assetKey}
                        accessibilityLabel="Outfit"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {SHOES.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">Shoes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  {SHOES.map((shoe, index) => {
                    const assetKey = idAt('shoes', index);
                    return (
                      <AssetPickerTile
                        key={`fb-shoe-${assetKey ?? index}`}
                        source={tileArtwork('shoes', index, shoe).source}
                        imageClassName="w-[280%] h-[280%] absolute bottom-[0%]"
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedShoes === index}
                        onSelect={() => setSelectedShoes(index)}
                        onPurchase={() => handlePurchase('shoes', index)}
                        onBlocked={() => explainBlocked('shoes', index)}
                        isPurchasing={purchasingKey !== null && purchasingKey === assetKey}
                        accessibilityLabel="Shoes"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        )}

      </ScrollView>

      {/* Floating Create Avatar Button */}
      <View className="absolute bottom-8 w-full px-10">
        <TouchableOpacity
          className="w-full bg-black/60 border border-[#B366FF] py-4 rounded-full items-center justify-center backdrop-blur-md"
          activeOpacity={0.8}
          disabled={isUpdating || isSaving}
          onPress={async () => {
            if (!viewShotRef.current?.capture) return;

            if (!activeBase) {
              showToast.error('This avatar base is no longer available');
              return;
            }

            try {
              setIsSaving(true);

              /**
               * Every remote layer must be cached before the shutter opens.
               *
               * `ViewShot` photographs whatever is on screen at that instant,
               * so a layer still in flight is captured as a hole and then
               * uploaded as the user's avatar - silently, because the capture
               * itself succeeds. The settle below is a couple of frames, which
               * is enough for bundled art that is already decoded and nowhere
               * near enough for a network fetch.
               *
               * Failing the save is the right outcome here: an avatar missing
               * its outfit is worse than one the user has to save twice.
               */
              const pending = resolveConfig(buildConfig(), catalogue.artwork).map(
                (layer) => layer.source,
              );
              const artwork = await prefetchSources(pending);

              if (!artwork.ok) {
                showToast.error(
                  'Artwork still loading',
                  'Some parts of your avatar have not finished downloading. Check your connection and try again.',
                );
                return;
              }

              // Freeze the blink loop and strip the card chrome, then let a
              // couple of frames land before capturing so the snapshot is
              // deterministic and has a transparent background.
              setEyeState('open');
              setIsCapturing(true);
              await new Promise((resolve) => setTimeout(resolve, 120));

              let uri: string;
              try {
                uri = await viewShotRef.current.capture();
              } finally {
                setIsCapturing(false);
              }
              const config = buildConfig();

              // Reuses the shared upload helper: it checks the PUT response and
              // returns the S3 *key*. The key is what gets persisted - a signed
              // URL expires, and the backend re-signs on every read.
              const avatarKey = await uploadImage(
                { uri, fileName: `avatar_${Date.now()}.png`, type: 'image/png' },
                getPreSignedUrl as any,
                0,
                'Profile_Images',
              );

              const saved = await saveAvatarToServer({
                avatarUrl: avatarKey,
                avatarConfig: config,
              }).unwrap();

              // Reflect it immediately, and persist so it survives a restart -
              // Redux alone is wiped on relaunch.
              // The API returns a signed URL; `?? undefined` because the auth
              // user type models "no avatar" as absent rather than null.
              const signedAvatarUrl = saved?.avatarUrl ?? undefined;
              dispatch(updateUser({ avatarUrl: signedAvatarUrl }));
              const storedUser = (await authStorage.getUser()) || {};
              await authStorage.saveUser({
                ...storedUser,
                avatarUrl: signedAvatarUrl,
                needsAvatarSetup: false,
              });

              await authService.handleAvatarSetupCompleted(dispatch as any);

              showToast.success('Avatar created successfully');

              const returnTo = route.params?.returnTo;
              if (
                returnTo &&
                returnTo !== 'Home' &&
                returnTo !== 'ExploreAvatar' &&
                returnTo !== 'GenerateAvatar'
              ) {
                navigation.navigate(returnTo as any);
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              }
            } catch (error: any) {
              // Previously this was a bare console.error, so every failure -
              // including the presign rejecting an invalid primaryPath - looked
              // to the user like the button simply did nothing. Surface enough
              // detail to tell a capture failure from a network one.
              // The backend validates the config on save, so a rejection here
              // is a real answer about the parts rather than a transport fault.
              if (error?.status === 403) {
                showToast.error('You do not own every part', error?.data?.message);
                return;
              }

              const status = error?.status ? ` (${error.status})` : '';
              const detail =
                error?.data?.message || error?.message || 'Unexpected error';
              console.error('[avatar] save failed', error);
              showToast.error('Could not save your avatar', `${detail}${status}`);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <Text className="text-white font-semibold text-base">{isUpdating || isSaving ? 'Saving...' : 'Create avatar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0318',
  },
  // Applied only while capturing, so the PNG has no card background or border.
  capturingContainer: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  previewContainer: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#5B1F7D',
    overflow: 'hidden',
    backgroundColor: '#1A0B2E',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 16,
  },
  avatarStage: {
    width: '90%',
    height: '95%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullbodyStage: {
    width: '160%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Scale is composed into the animated transform, not set here - see
    // FULLBODY_STAGE_SCALE.
  },
});

export default GenerateAvatarScreen;
