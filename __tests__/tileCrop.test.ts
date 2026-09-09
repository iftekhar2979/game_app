import fs from 'fs';
import path from 'path';

import {
  cropFor,
  framingFor,
  TILE_CROP,
  TILE_FRAME,
  TONE_CROP,
  WHOLE,
} from '../src/avatar/tileCrop';
import { AVATAR_SLOTS } from '../src/avatar/types';

/**
 * How picker tiles frame their artwork.
 *
 * Garment artwork is drawn on a full-body canvas, so a tile that shows the
 * whole canvas shows a speck. These pin the two things that made the pickers
 * unreadable and would silently come back: a slot drawn whole, and a slot
 * framed one way in the full-body editor and another way in the half-body one.
 */

const sourceOf = (file: string) =>
  fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');

/** The scale factor out of a class like `w-[380%] h-[380%] ...`. */
function scaleOf(crop: string): number {
  const match = crop.match(/w-\[(\d+)%\]/);
  return match ? Number(match[1]) : 100;
}

describe('every slot is framed', () => {
  it.each(AVATAR_SLOTS)('has a crop for %s', slot => {
    expect(TILE_CROP[slot]).toBeTruthy();
    expect(cropFor(slot)).toBe(TILE_CROP[slot]);
  });

  /**
   * The regression this exists for.
   *
   * `bodyColor` was `w-full h-full` - the whole body shrunk into a 72px tile,
   * which is the one framing that guarantees the asset cannot be made out.
   */
  it.each(AVATAR_SLOTS)(
    'zooms into %s rather than showing the whole canvas',
    slot => {
      expect(scaleOf(TILE_CROP[slot])).toBeGreaterThan(100);
      expect(TILE_CROP[slot]).not.toContain('w-full');
    },
  );

  it('zooms every slot enough to read a part on a full-body canvas', () => {
    // A garment occupies well under half the canvas height, so anything below
    // roughly 2x is still showing mostly empty space.
    for (const slot of AVATAR_SLOTS) {
      expect(scaleOf(TILE_CROP[slot])).toBeGreaterThanOrEqual(250);
    }
  });

  it('frames the skin-tone row too, which shows whole bodies', () => {
    expect(scaleOf(TONE_CROP)).toBeGreaterThan(100);
  });
});

describe('a slot is framed the same way everywhere', () => {
  /**
   * The editor has two layouts - half-body and full-body - and they used to
   * carry separate copies of every picker. That is how the half-body outfit
   * tile ended up at `w-[50%]`, zoomed *out*, while its full-body twin was at
   * `w-[220%]`.
   */
  it('leaves no hand-written crop in the editor', () => {
    const editor = sourceOf('screens/Avatar/GenerateAvatarScreen.tsx');

    expect(editor).not.toContain('imageClassName');
    // No literal percentage crops: they all come from the table now.
    expect(editor).not.toMatch(/className="w-\[\d+%\] h-\[\d+%\]/);
  });

  it('draws every tile at one shared size', () => {
    const editor = sourceOf('screens/Avatar/GenerateAvatarScreen.tsx');
    const picker = sourceOf('components/Avatar/AssetPickerTile.tsx');
    const none = sourceOf('components/Avatar/NoneOptionTile.tsx');

    for (const source of [editor, picker, none]) {
      expect(source).toContain('TILE_FRAME');
      // The old hardcoded size, which left the "none" tile a different size
      // from the assets beside it whenever one of them was re-tuned.
      expect(source).not.toContain('w-[72px] h-[90px]');
    }
  });

  it('makes the tile large enough for the zoom to be worth anything', () => {
    const width = Number(TILE_FRAME.match(/w-\[(\d+)px\]/)![1]);
    const height = Number(TILE_FRAME.match(/h-\[(\d+)px\]/)![1]);

    expect(width).toBeGreaterThanOrEqual(96);
    expect(height).toBeGreaterThan(width);
  });
});

/**
 * The crop is a fallback, not the mechanism.
 *
 * One set of numbers per slot is necessarily wrong for any garment cut
 * differently from the ones it was tuned against - a long coat framed like a
 * t-shirt. Uploading a thumbnail is how that gets fixed, and it only works if
 * the thumbnail is left alone.
 */
describe('framing an asset', () => {
  it.each(AVATAR_SLOTS)('draws an uploaded thumbnail for %s whole', (slot) => {
    expect(framingFor(slot, true)).toBe(WHOLE);
    // Cropping a hand-framed thumbnail would undo the framing, and the crops
    // are tuned for full-body canvases, which a thumbnail is not.
    expect(framingFor(slot, true)).not.toContain('absolute');
  });

  it.each(AVATAR_SLOTS)('crops %s when no thumbnail was uploaded', (slot) => {
    expect(framingFor(slot, false)).toBe(cropFor(slot));
    expect(framingFor(slot, undefined)).toBe(cropFor(slot));
  });

  it('treats a missing flag as no thumbnail, so nothing is shown uncropped by accident', () => {
    // `hasThumbnail` is optional all the way down; an older row, or one the
    // server did not describe, must fall back to the crop rather than to WHOLE.
    for (const slot of AVATAR_SLOTS) {
      expect(framingFor(slot)).not.toBe(WHOLE);
    }
  });
});
