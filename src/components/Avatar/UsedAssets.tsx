import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { UsedAsset, UsedAssetSlot, humaniseAssetId } from '../../avatar/resolveConfig';

/**
 * What the selected avatar is built from.
 *
 * Every row comes from the saved `avatarConfig`, resolved through the registry
 * by stable id — never from picker state and never from the full catalogue, so
 * this lists exactly the parts this one avatar uses.
 */

/**
 * How far to zoom into each part's artwork for a thumbnail.
 *
 * Part PNGs are painted on a full-body canvas, so a shoe drawn at the bottom of
 * a tall transparent image needs a different crop than hair at the top. These
 * mirror the per-slot values the editor's pickers already use; keep them in step
 * with `GenerateAvatarScreen` if those are retuned.
 */
const FRAMING: Record<UsedAssetSlot, { scale: number; top?: number; bottom?: number }> = {
  base: { scale: 1, top: 0 },
  bodyColor: { scale: 1, top: 0 },
  hair: { scale: 2.5, top: -0.1 },
  hairColor: { scale: 1, top: 0 },
  outfit: { scale: 2.2, top: -0.25 },
  skirt: { scale: 2.2, top: -0.4 },
  shoes: { scale: 2.8, bottom: 0 },
};

const TILE_W = 66;
const TILE_H = 82;

function Thumbnail({ item }: { item: UsedAsset }) {
  // The tint row has no artwork - the swatch is the content.
  if (item.slot === 'hairColor') {
    return (
      <View style={[styles.tile, styles.centred]}>
        {item.color ? (
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
        ) : (
          <Text style={styles.tileNote}>Original</Text>
        )}
      </View>
    );
  }

  if (item.status === 'retired') {
    return (
      <View style={[styles.tile, styles.centred, styles.tileRetired]}>
        <Text style={styles.tileNote}>Retired</Text>
      </View>
    );
  }

  if (!item.source) {
    return (
      <View style={[styles.tile, styles.centred]}>
        <Text style={styles.tileNote}>None</Text>
      </View>
    );
  }

  const frame = FRAMING[item.slot];

  return (
    <View style={styles.tile}>
      <Image
        source={item.source}
        resizeMode="contain"
        style={{
          position: 'absolute',
          width: `${frame.scale * 100}%`,
          height: `${frame.scale * 100}%`,
          ...(frame.bottom !== undefined
            ? { bottom: `${frame.bottom * 100}%` }
            : { top: `${(frame.top ?? 0) * 100}%` }),
        }}
      />
    </View>
  );
}

export default function UsedAssets({ items }: { items: UsedAsset[] }) {
  // An empty slot is not something the avatar "uses", so it is left out. The
  // tint row stays either way: "no tint" is a real choice, not a gap.
  const rows = items.filter((item) => item.status !== 'none' || item.slot === 'hairColor');

  if (!rows.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Used assets</Text>

      <View style={styles.grid}>
        {rows.map((item) => (
          <View key={item.slot} style={styles.cell}>
            <Thumbnail item={item} />
            <Text style={styles.label}>{item.label}</Text>
            <Text
              style={[styles.value, item.status === 'retired' && styles.valueRetired]}
              numberOfLines={2}
            >
              {item.slot === 'hairColor'
                ? item.color ?? 'Original'
                : item.assetId
                ? humaniseAssetId(item.assetId)
                : 'None'}
            </Text>
          </View>
        ))}
      </View>

      {rows.some((item) => item.status === 'retired') && (
        <Text style={styles.footnote}>
          Retired parts are no longer in the app, so they are left off this avatar rather
          than swapped for something else.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 28 },
  heading: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: TILE_W + 12, paddingHorizontal: 6, marginBottom: 16, alignItems: 'center' },
  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A2A50',
    backgroundColor: '#1A0B2E',
    overflow: 'hidden',
    alignItems: 'center',
  },
  tileRetired: { borderStyle: 'dashed', backgroundColor: '#191320' },
  centred: { justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#00000055' },
  tileNote: { color: '#6B6478', fontSize: 9, fontWeight: '600' },
  label: {
    color: '#8C849C',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 7,
  },
  value: { color: '#D8D2E4', fontSize: 10, marginTop: 2, textAlign: 'center' },
  valueRetired: { color: '#6B6478', fontStyle: 'italic' },
  footnote: { color: '#6B6478', fontSize: 11, lineHeight: 16, marginTop: 2 },
});
