import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Filter,
  FeColorMatrix,
  Image as SvgImage,
} from 'react-native-svg';
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
import {
  useGetAvatarCharactersQuery,
  usePurchaseAvatarAssetMutation,
} from '../../store/api/avatarAssetsApi';
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
import {
  prefetchEditorArtwork,
  prefetchSources,
} from '../../avatar/prefetchArtwork';
import { framingFor, TILE_FRAME, TONE_CROP } from '../../avatar/tileCrop';
import {
  type EditorPartChoices,
  previewPartsOf,
  resolveEditorPart,
} from '../../avatar/editorSelection';
import { AvatarAsset, AvatarConfig, AvatarSlot } from '../../avatar/types';
import { hexToTintMatrix } from '../../avatar/hairTint';
import {
  blinkOpacity,
  blinkSourcesFor,
  describeVariant,
  characterIdOf,
  resolveBaseById,
  tonesForBase,
} from '../../avatar/baseCatalogue';
import { resolveParts } from '../../avatar/partCatalogue';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GenerateAvatar'
>;
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

  const [saveAvatarToServer, { isLoading: isUpdating }] =
    useSaveAvatarMutation();
  const [getPreSignedUrl] = useLazyGetPreSignedUrlQuery();
  const [isSaving, setIsSaving] = useState(false);

  const [purchaseAsset] = usePurchaseAvatarAssetMutation();
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);
  // Strips the preview chrome for the one frame that gets captured.
  const [isCapturing, setIsCapturing] = useState(false);

  const target = route.params?.target || 'female';

  /**
   * Which tone of the character is being worn.
   *
   * Explore hands over a body rather than a character, so the editor owns the
   * choice between that character's tones. Null means "whatever the route
   * asked for", which is what keeps a saved look reopening on the exact body it
   * was built on.
   */
  const [chosenBaseId, setChosenBaseId] = useState<string | null>(
    // Read from the route rather than `savedConfig`, which is declared further
    // down: a lazy initializer still runs during this first render, so
    // referencing it here would throw before it exists.
    () => route.params?.config?.base ?? route.params?.baseId ?? null,
  );

  /**
   * The character whose wardrobe this screen shows.
   *
   * Everything on this screen is scoped to it, and the scoping happens on the
   * server - `useAssetCatalogue` fetches this character's assets and holds no
   * others, so there is no list here to filter and no filter that could be
   * wrong. The catalogue decides what may be picked; the bundled registry still
   * decides what gets drawn, so a network failure degrades selection only.
   */
  const characterList = useGetAvatarCharactersQuery();
  const characterId = useMemo(
    () => characterIdOf(chosenBaseId, characterList.data),
    [chosenBaseId, characterList.data],
  );

  const catalogue = useAssetCatalogue(characterId);

  /**
   * Fall back to the first character when nothing chose one.
   *
   * Anything navigating here without a body - a deep link, or an older screen -
   * would otherwise leave `characterId` null, and the wardrobe query is skipped
   * while it is. Skipped is the right behaviour rather than a bug to route
   * around: fetching an unscoped catalogue as a default is exactly what this
   * screen no longer does. So it picks a character instead, and scopes to that.
   */
  useEffect(() => {
    if (chosenBaseId) return;

    const first = characterList.data?.[0];
    if (first?.primary) setChosenBaseId(first.primary.key);
  }, [chosenBaseId, characterList.data]);

  /** The tones this character is offered in. One entry means nothing to choose. */
  const bodyVariants = useMemo(
    () => tonesForBase(chosenBaseId, catalogue.characters),
    [chosenBaseId, catalogue.characters],
  );

  const activeBase = useMemo(
    () =>
      bodyVariants.find(base => base.id === chosenBaseId) ??
      bodyVariants[0] ??
      resolveBaseById(chosenBaseId),
    [bodyVariants, chosenBaseId],
  );

  const activeBaseId = activeBase?.id ?? chosenBaseId ?? null;

  /**
   * The exact look advertised on the Explore card.
   *
   * The character response carries these layers specifically so opening a
   * card can continue from the dressed preview the player tapped. The scoped
   * wardrobe request normally arrives a render or two later, so this data is
   * also the only source that can paint a complete first frame instead of a
   * bare base body.
   */
  const activeCharacter = useMemo(
    () =>
      characterList.data?.find(
        character => character.characterId === characterId,
      ),
    [characterId, characterList.data],
  );

  const previewParts = useMemo(
    () => previewPartsOf(activeCharacter?.previewLayers),
    [activeCharacter],
  );

  const previewArtwork = useMemo(
    () =>
      Object.fromEntries(
        (activeCharacter?.previewLayers ?? []).map(layer => [
          layer.key,
          { imageUrl: layer.imageUrl, previewUrl: layer.imageUrl },
        ]),
      ),
    [activeCharacter],
  );

  // Prefer the scoped wardrobe once it arrives, while retaining the card's
  // artwork during the request (and as a graceful fallback if it fails).
  const editorArtwork = useMemo(
    () => ({ ...previewArtwork, ...catalogue.artwork }),
    [catalogue.artwork, previewArtwork],
  );

  /**
   * Options per slot.
   *
   * `catalogue.assets` is already this character's wardrobe and nothing else,
   * so `resolveParts` only has to turn rows into drawable entries. It used to
   * take a target and a category and do the matching itself, which is what let
   * one character's garments reach another's picker.
   */
  const optionsFor = useMemo(() => {
    const cache: Partial<Record<AvatarSlot, AvatarAsset[]>> = {};
    return (slot: AvatarSlot): AvatarAsset[] => {
      if (!cache[slot]) {
        cache[slot] = resolveParts(
          slot,
          activeBase?.target ?? target,
          catalogue.assets,
        );
      }
      return cache[slot]!;
    };
  }, [catalogue.assets, activeBase?.target, target]);

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
  /**
   * The pickers still hold indices into their filtered lists; the registry
   * preserves that same order, so an index maps back to a stable asset id here.
   * Only ids are ever persisted - an index would silently point at different
   * artwork as soon as any asset is added or reordered.
   */
  /**
   * A selection, confirmed against what this character is actually offered.
   *
   * Selections are stable asset keys rather than indices into the picker list.
   * They used to be indices, which made every selection depend on the list's
   * length and order: adding or reordering an asset silently changed what an
   * already-made choice meant, and the ordering had to be frozen across the
   * bundled and catalogue halves to stop it. A key means the same thing
   * whatever the list does.
   *
   * Still confirmed rather than trusted, because the list can change under a
   * held selection: switching tone, or an asset being unassigned between the
   * screen opening and a save. A key that is no longer offered resolves to
   * null, which empties the slot rather than saving something this character
   * may not wear.
   */
  const keyIn = (slot: AvatarSlot, assetKey: string | null): string | null => {
    if (!assetKey) return null;
    return optionsFor(slot).some((asset) => asset.id === assetKey)
      ? assetKey
      : null;
  };

  /**
   * Artwork for a selected key, uploaded where the catalogue has any.
   *
   * `layerArtwork` feeds the preview stage and needs the full-resolution image;
   * `tileArtwork` feeds the picker tiles and prefers the smaller preview,
   * because a layer PNG is painted on a full-body canvas and the bases run to
   * half a megabyte each.
   */
  const layerArtwork = (
    slot: AvatarSlot,
    assetKey: string | null,
  ): ArtworkWithFallback => artworkForAsset(slot, assetKey, editorArtwork);

  const tileArtwork = (
    slot: AvatarSlot,
    asset: AvatarAsset,
  ): ArtworkWithFallback => {
    const artwork = previewArtworkForAsset(slot, asset.id, catalogue.artwork);
    return {
      source: artwork.source ?? asset.source,
      fallback: artwork.fallback ?? asset.source,
    };
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
   * Buys a locked asset. The backend debits the coins inside a transaction and
   * writes the entitlement; the client never touches the balance itself.
   *
   * `purchasingKey` is what prevents a double tap becoming two requests - the
   * tile is disabled for the duration, and the mutation is only ever in flight
   * for one asset at a time.
   */
  const handlePurchase = async (slot: AvatarSlot, assetKey: string) => {
    const key = keyIn(slot, assetKey);
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
  const explainBlocked = (slot: AvatarSlot, assetKey: string) => {
    const availability = catalogue.stateOf(keyIn(slot, assetKey)).availability;

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
      bodyColor: keyIn('bodyColor', selectedBodyColor),
      skirt: keyIn('skirt', isFullbody ? selectedFullbodySkirt : null),
      shoes: keyIn('shoes', isFullbody ? selectedShoes : null),
      outfit: keyIn(
        'outfit',
        isFullbody ? selectedFullbodyOutfit : selectedBody,
      ),
      hair: keyIn('hair', isFullbody ? selectedFullbodyHair : selectedHair),
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
      activeBase.id,
      editorArtwork,
    ).catch(() => undefined);
  }, [activeBase, catalogue.isLoading, editorArtwork]);

  /**
   * Blink overlays.
   *
   * A body uploaded through the dashboard carries its own closed-eye artwork,
   * because the bundled overlays are drawn for the five shipped silhouettes and
   * would not sit correctly on anything else. Without one it falls back to
   * those; with blinking turned off it draws neither.
   */
  const blink = activeBase ? blinkSourcesFor(activeBase) : null;

  // The bundled pair, used only when this body brought no closed frame of its
  // own. Resolved from the body actually being worn rather than the route, so a
  // catalogue base with no artwork still gets overlays drawn for its target.
  const eyeTarget = activeBase?.target ?? target;
  const halfClosedEyeSource = getEyeSource('half', eyeTarget, activeBaseId);
  const fullClosedEyeSource = getEyeSource('full', eyeTarget, activeBaseId);

  // Shared state
  const [selectedHairColor, setSelectedHairColor] = useState<string | null>(
    () => savedConfig?.hairColor ?? null,
  );

  /**
   * Only choices the player actually changes are stored.
   *
   * Deriving untouched choices is important here: `useState(() => seed())`
   * used to run while the scoped wardrobe was still empty, permanently
   * storing null for every layer. The preview therefore opened as the bare
   * base even though the card the player tapped was fully dressed. Keeping
   * overrides separate lets the preview defaults become available as the
   * character query resolves, without an effect that could overwrite a fast
   * tap.
   */
  const [partChoices, setPartChoices] = useState<EditorPartChoices>({});
  const choosePart = (slot: AvatarSlot, assetKey: string | null) => {
    setPartChoices(current => ({ ...current, [slot]: assetKey }));
  };

  const canValidateSelections =
    Boolean(characterId) && !catalogue.isLoading && !catalogue.isUnavailable;

  const selectionFor = (
    slot: AvatarSlot,
    fallbackToFirst: boolean,
  ): string | null =>
    resolveEditorPart({
      slot,
      choices: partChoices,
      savedConfig,
      previewParts,
      options: optionsFor(slot),
      canValidate: canValidateSelections,
      fallbackToFirst,
    });

  // A skin overlay only exists for a character that was assigned one, so the
  // list being empty is the whole test - no number stands in for it any more.
  const selectedBodyColor = selectionFor('bodyColor', true);
  const setSelectedBodyColor = (assetKey: string | null) =>
    choosePart('bodyColor', assetKey);

  // Both editor layouts read the same slot choices. The aliases keep the JSX
  // descriptive while ensuring the card preview is identical in either mode.
  const selectedHair = !isFullbody ? selectionFor('hair', true) : null;
  const setSelectedHair = (assetKey: string | null) =>
    choosePart('hair', assetKey);
  const selectedBody = !isFullbody ? selectionFor('outfit', true) : null;
  const setSelectedBody = (assetKey: string | null) =>
    choosePart('outfit', assetKey);
  const selectedFullbodyHair = isFullbody ? selectionFor('hair', true) : null;
  const setSelectedFullbodyHair = (assetKey: string | null) =>
    choosePart('hair', assetKey);
  const selectedFullbodySkirt = isFullbody ? selectionFor('skirt', true) : null;
  const setSelectedFullbodySkirt = (assetKey: string | null) =>
    choosePart('skirt', assetKey);
  const selectedFullbodyOutfit = isFullbody
    ? selectionFor('outfit', true)
    : null;
  const setSelectedFullbodyOutfit = (assetKey: string | null) =>
    choosePart('outfit', assetKey);
  const selectedShoes = isFullbody ? selectionFor('shoes', true) : null;
  const setSelectedShoes = (assetKey: string | null) =>
    choosePart('shoes', assetKey);

  // Eye Animation State
  const [eyeState, setEyeState] = useState<'open' | 'half_closed' | 'closed'>(
    'open',
  );

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
      ]),
    ).start();
  }, [breatheAnim]);

  const breatheScaleY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
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

  /**
   * Whether this body has anything at all drawn for it.
   *
   * Every picker hides itself when its slot is empty, which is right - but a
   * body with nothing in any slot would then show a bare screen with no
   * explanation. A base given its own category starts exactly there, until
   * garments are drawn for it.
   */
  const hasAnyWardrobe =
    HAIR_STYLES.length > 0 ||
    BLAZERS.length > 0 ||
    FULLBODY_SKIRTS.length > 0 ||
    SHOES.length > 0 ||
    BODY_COLORS.length > 0;
  const halfOutfitArt = layerArtwork(
    'outfit',
    isFullbody ? null : selectedBody,
  );
  const halfHairArt = layerArtwork('hair', isFullbody ? null : selectedHair);
  const fullSkirtArt = layerArtwork(
    'skirt',
    isFullbody ? selectedFullbodySkirt : null,
  );
  const fullShoesArt = layerArtwork('shoes', isFullbody ? selectedShoes : null);
  const fullOutfitArt = layerArtwork(
    'outfit',
    isFullbody ? selectedFullbodyOutfit : null,
  );
  const fullHairArt = layerArtwork(
    'hair',
    isFullbody ? selectedFullbodyHair : null,
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Header */}
      <View className="flex-row items-center px-6 mb-8 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-[#1A0B2E] items-center justify-center border border-[#5B1F7D]"
          activeOpacity={0.8}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-medium ml-4">
          Customize Avatar
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
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
                  },
                ]}
              >
                {/* Base Head / Base Body */}
                <ArtworkImage
                  source={baseImage.source}
                  fallback={baseImage.fallback}
                  className="absolute w-full h-full"
                  resizeMode="contain"
                />

                {/* Skin tone.

                    Drawn whenever one resolved, rather than only for category
                    1. Gating on the number meant a tone picked on any other
                    body was accepted by the picker, saved, and then rendered
                    everywhere *except* the editor that had just refused to
                    show it - the profile and roster draw this layer with no
                    such test. */}
                {bodyColorArt.source && (
                  <ArtworkImage
                    source={bodyColorArt.source}
                    fallback={bodyColorArt.fallback}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                )}

                {/* Open eyes, for a body drawn without any. Bundled bodies
                    have them in the base artwork, so this draws nothing there. */}
                {blink?.normal ? (
                  <Image
                    source={blink.normal}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                  />
                ) : null}

                {/* Blink overlays. Both frames stay mounted so neither pops in
                    late; only opacity changes. A body that brought its own
                    closed frame uses that one for both phases, faded for the
                    half - see blinkOpacity. */}
                {blink?.blink ? (
                  <Image
                    source={blink.blink}
                    className="absolute w-full h-full"
                    resizeMode="contain"
                    style={{ opacity: blinkOpacity(eyeState) }}
                  />
                ) : (
                  <>
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
                  </>
                )}

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
              <Text className="text-white text-[13px] font-semibold">
                Parts unavailable
              </Text>
              <Text className="text-gray-400 text-[11px] mt-0.5">
                Could not load the asset catalogue, so nothing new can be
                selected.
              </Text>
            </View>
            <TouchableOpacity
              className="px-3 py-1.5 rounded-full border border-[#B366FF]"
              onPress={() => catalogue.refetch()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading avatar assets"
            >
              <Text className="text-[#B366FF] text-[11px] font-bold">
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customization Sections */}
        {!hasAnyWardrobe && (
          <View className="mx-6 mb-6 rounded-2xl border border-[#4B1E78] bg-[#1A0B2E] p-5">
            <Text className="text-white text-[15px] font-bold mb-1">
              Nothing to wear yet
            </Text>
            <Text className="text-gray-400 text-[13px] leading-5">
              No clothing, hair or shoes have been drawn for this body yet. You
              can still save it as it is, and anything added later will appear
              here.
            </Text>
          </View>
        )}

        {!isFullbody ? (
          <>
            {/* Hair Style . Hidden when this body has none: a heading over an
                empty row reads as artwork failing to load rather than as
                artwork nobody has drawn yet. */}
            {HAIR_STYLES.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Hair style
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {HAIR_STYLES.map((hair, index) => (
                    <TouchableOpacity
                      key={`hair-${index}`}
                      activeOpacity={0.8}
                      className="mr-3 items-center"
                      onPress={() => setSelectedHair(hair.id)}
                    >
                      <View
                        className={`${TILE_FRAME} rounded-xl border border-[#5B1F7D] bg-[#1A0B2E] overflow-hidden items-center`}
                      >
                        <ArtworkImage
                          source={tileArtwork('hair', hair).source}
                          fallback={tileArtwork('hair', hair).fallback}
                          className={framingFor('hair', hair.hasThumbnail)}
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Hair Color */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">
                Hair color
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {HAIR_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={`color-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHairColor(color)}
                  >
                    <View
                      className={`w-[60px] h-[60px] rounded-full mb-3 border-2 ${
                        selectedHairColor === color
                          ? 'border-white'
                          : 'border-[#5B1F7D]'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Blazer . Hidden when this body has none: a heading over an
                empty row reads as artwork failing to load rather than as
                artwork nobody has drawn yet. */}
            {BLAZERS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Blazer
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {BLAZERS.map((blazer, index) => (
                    <TouchableOpacity
                      key={`blazer-${index}`}
                      activeOpacity={0.8}
                      className="mr-3 items-center opacity-80"
                      onPress={() => setSelectedBody(blazer.id)}
                    >
                      <View
                        className={`${TILE_FRAME} rounded-xl border border-[#3A144E] bg-black/40 overflow-hidden items-center`}
                      >
                        <ArtworkImage
                          source={tileArtwork('outfit', blazer).source}
                          fallback={tileArtwork('outfit', blazer).fallback}
                          className={framingFor('outfit', blazer.hasThumbnail)}
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Body Color (Half Body) */}
            {/* Body colour: the tones this character is drawn in.
                Hidden when there is only one, since there is nothing to
                choose. Switching swaps the body itself rather than painting an
                overlay on it, so the artwork is always the one that was
                drawn. */}
            {bodyVariants.length > 1 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Body colour
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {bodyVariants.map((variant, index) => (
                    <TouchableOpacity
                      key={variant.id}
                      activeOpacity={0.8}
                      className="mr-3 items-center"
                      accessibilityRole="button"
                      accessibilityLabel={`Body colour ${describeVariant(
                        variant,
                        index,
                      )}`}
                      accessibilityState={{
                        selected: activeBase?.id === variant.id,
                      }}
                      onPress={() => setChosenBaseId(variant.id)}
                    >
                      <View
                        className={`${TILE_FRAME} rounded-xl border-2 ${
                          activeBase?.id === variant.id
                            ? 'border-[#B366FF]'
                            : 'border-[#5B1F7D]'
                        } bg-[#1A0B2E] overflow-hidden items-center`}
                      >
                        <ArtworkImage
                          source={variant.source}
                          fallback={variant.source}
                          className={TONE_CROP}
                          resizeMode="contain"
                        />
                      </View>
                      <Text className="text-gray-300 text-[11px] mt-1.5">
                        {describeVariant(variant, index)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {BODY_COLORS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Skin tone
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {/* Clearing a tone is a choice of its own, not a second tap
                      on the one you already picked. */}
                  <NoneOptionTile
                    isSelected={selectedBodyColor === null}
                    onSelect={() => setSelectedBodyColor(null)}
                    accessibilityLabel="No skin tone overlay"
                  />
                  {BODY_COLORS.map((bodyColor, index) => {
                    const assetKey = bodyColor.id;
                    return (
                      <AssetPickerTile
                        key={`fb-body-color-${assetKey ?? index}`}
                        source={tileArtwork('bodyColor', bodyColor).source}
                        slot="bodyColor"
                        hasThumbnail={bodyColor.hasThumbnail}
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedBodyColor === bodyColor.id}
                        onSelect={() => setSelectedBodyColor(bodyColor.id)}
                        onPurchase={() => handlePurchase('bodyColor', assetKey)}
                        onBlocked={() => explainBlocked('bodyColor', assetKey)}
                        isPurchasing={
                          purchasingKey !== null && purchasingKey === assetKey
                        }
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
            {/* Full Body Hair Style . Hidden when this body has none: a heading over an
                empty row reads as artwork failing to load rather than as
                artwork nobody has drawn yet. */}
            {FULLBODY_HAIR.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Full Body Hair
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {FULLBODY_HAIR.map((hair, index) => {
                    const assetKey = hair.id;
                    return (
                      <AssetPickerTile
                        key={`fb-hair-${assetKey ?? index}`}
                        source={tileArtwork('hair', hair).source}
                        slot="hair"
                        hasThumbnail={hair.hasThumbnail}
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedFullbodyHair === hair.id}
                        onSelect={() => setSelectedFullbodyHair(hair.id)}
                        onPurchase={() => handlePurchase('hair', assetKey)}
                        onBlocked={() => explainBlocked('hair', assetKey)}
                        isPurchasing={
                          purchasingKey !== null && purchasingKey === assetKey
                        }
                        accessibilityLabel="Hair style"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Hair Color (Shared) */}
            <View className="mb-6">
              <Text className="text-white text-base font-medium px-6 mb-4">
                Hair color
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {HAIR_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={`fb-color-${index}`}
                    activeOpacity={0.8}
                    className="mr-3 items-center"
                    onPress={() => setSelectedHairColor(color)}
                  >
                    <View
                      className={`w-[60px] h-[60px] rounded-full mb-3 border-2 ${
                        selectedHairColor === color
                          ? 'border-white'
                          : 'border-[#5B1F7D]'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Skin tone (Full Body) */}
            {/* Body colour: the tones this character is drawn in.
                Hidden when there is only one, since there is nothing to
                choose. Switching swaps the body itself rather than painting an
                overlay on it, so the artwork is always the one that was
                drawn. */}
            {bodyVariants.length > 1 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Body colour
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {bodyVariants.map((variant, index) => (
                    <TouchableOpacity
                      key={variant.id}
                      activeOpacity={0.8}
                      className="mr-3 items-center"
                      accessibilityRole="button"
                      accessibilityLabel={`Body colour ${describeVariant(
                        variant,
                        index,
                      )}`}
                      accessibilityState={{
                        selected: activeBase?.id === variant.id,
                      }}
                      onPress={() => setChosenBaseId(variant.id)}
                    >
                      <View
                        className={`${TILE_FRAME} rounded-xl border-2 ${
                          activeBase?.id === variant.id
                            ? 'border-[#B366FF]'
                            : 'border-[#5B1F7D]'
                        } bg-[#1A0B2E] overflow-hidden items-center`}
                      >
                        <ArtworkImage
                          source={variant.source}
                          fallback={variant.source}
                          className={TONE_CROP}
                          resizeMode="contain"
                        />
                      </View>
                      <Text className="text-gray-300 text-[11px] mt-1.5">
                        {describeVariant(variant, index)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {BODY_COLORS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Skin tone
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {/* Clearing a tone is a choice of its own, not a second tap
                      on the one you already picked. */}
                  <NoneOptionTile
                    isSelected={selectedBodyColor === null}
                    onSelect={() => setSelectedBodyColor(null)}
                    accessibilityLabel="No skin tone overlay"
                  />
                  {BODY_COLORS.map((bodyColor, index) => {
                    const assetKey = bodyColor.id;
                    return (
                      <AssetPickerTile
                        key={`fb-body-color-${assetKey ?? index}`}
                        source={tileArtwork('bodyColor', bodyColor).source}
                        slot="bodyColor"
                        hasThumbnail={bodyColor.hasThumbnail}
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedBodyColor === bodyColor.id}
                        onSelect={() => setSelectedBodyColor(bodyColor.id)}
                        onPurchase={() => handlePurchase('bodyColor', assetKey)}
                        onBlocked={() => explainBlocked('bodyColor', assetKey)}
                        isPurchasing={
                          purchasingKey !== null && purchasingKey === assetKey
                        }
                        accessibilityLabel="Skin tone"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {FULLBODY_SKIRTS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Skirt
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {FULLBODY_SKIRTS.map((skirt, index) => {
                    const assetKey = skirt.id;
                    return (
                      <AssetPickerTile
                        key={`fb-skirt-${assetKey ?? index}`}
                        source={tileArtwork('skirt', skirt).source}
                        slot="skirt"
                        hasThumbnail={skirt.hasThumbnail}
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedFullbodySkirt === skirt.id}
                        onSelect={() => setSelectedFullbodySkirt(skirt.id)}
                        onPurchase={() => handlePurchase('skirt', assetKey)}
                        onBlocked={() => explainBlocked('skirt', assetKey)}
                        isPurchasing={
                          purchasingKey !== null && purchasingKey === assetKey
                        }
                        accessibilityLabel="Skirt"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {FULLBODY_OUTFITS.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Full Body Outfit
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {FULLBODY_OUTFITS.map((outfit, index) => {
                    const assetKey = outfit.id;
                    return (
                      <AssetPickerTile
                        key={`fb-outfit-${assetKey ?? index}`}
                        source={tileArtwork('outfit', outfit).source}
                        slot="outfit"
                        hasThumbnail={outfit.hasThumbnail}
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedFullbodyOutfit === outfit.id}
                        onSelect={() => setSelectedFullbodyOutfit(outfit.id)}
                        onPurchase={() => handlePurchase('outfit', assetKey)}
                        onBlocked={() => explainBlocked('outfit', assetKey)}
                        isPurchasing={
                          purchasingKey !== null && purchasingKey === assetKey
                        }
                        accessibilityLabel="Outfit"
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {SHOES.length > 0 && (
              <View className="mb-6">
                <Text className="text-white text-base font-medium px-6 mb-4">
                  Shoes
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 24 }}
                >
                  {SHOES.map((shoe, index) => {
                    const assetKey = shoe.id;
                    return (
                      <AssetPickerTile
                        key={`fb-shoe-${assetKey ?? index}`}
                        source={tileArtwork('shoes', shoe).source}
                        slot="shoes"
                        hasThumbnail={shoe.hasThumbnail}
                        state={catalogue.stateOf(assetKey)}
                        isSelected={selectedShoes === shoe.id}
                        onSelect={() => setSelectedShoes(shoe.id)}
                        onPurchase={() => handlePurchase('shoes', assetKey)}
                        onBlocked={() => explainBlocked('shoes', assetKey)}
                        isPurchasing={
                          purchasingKey !== null && purchasingKey === assetKey
                        }
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
              const pending = resolveConfig(
                buildConfig(),
                catalogue.artwork,
              ).map(layer => layer.source);
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
              await new Promise(resolve => setTimeout(resolve, 120));

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
                {
                  uri,
                  fileName: `avatar_${Date.now()}.png`,
                  type: 'image/png',
                },
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
                showToast.error(
                  'You do not own every part',
                  error?.data?.message,
                );
                return;
              }

              const status = error?.status ? ` (${error.status})` : '';
              const detail =
                error?.data?.message || error?.message || 'Unexpected error';
              console.error('[avatar] save failed', error);
              showToast.error(
                'Could not save your avatar',
                `${detail}${status}`,
              );
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <Text className="text-white font-semibold text-base">
            {isUpdating || isSaving ? 'Saving...' : 'Create avatar'}
          </Text>
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
