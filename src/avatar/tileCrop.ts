import { AvatarSlot } from './types';

/**
 * How a part is framed in a picker tile.
 *
 * Every garment is drawn on a **full-body canvas** - a shirt PNG is mostly
 * transparent, with the shirt occupying a band across the middle. Dropped into
 * a tile whole, it reads as a speck of colour floating in a box, and two
 * shirts of the same cut are indistinguishable. So each tile zooms into the
 * band its slot actually occupies and lets the rest overflow.
 *
 * These lived as six magic percentages scattered through the editor's JSX, one
 * per picker, which is how the half-body outfit tile came to be drawn at 50% -
 * zoomed *out*, showing a whole body two thumbnails wide - while its full-body
 * twin was at 220%. One table means a slot is framed the same way wherever it
 * appears, and re-tuning is one edit rather than six.
 *
 * The numbers are empirical, not derived: `resizeMode` letterboxes the artwork
 * inside the scaled box, so the visible band is not a clean function of the
 * scale. They were set by looking at the result, and the comment on each says
 * which part of the body it is aiming at so the next person can re-aim it.
 */

/**
 * Tile size.
 *
 * Larger than the 72x90 these used to be. Zooming in helps only if there are
 * pixels to zoom into: at 72px wide, two hairstyles that differ in their
 * fringe are the same thumbnail however tightly they are cropped.
 */
export const TILE_FRAME = 'w-[96px] h-[120px]';

/**
 * Per-slot framing, as a NativeWind class string.
 *
 * Every crop names **both** offsets. An absolutely-positioned child with no
 * `left` is placed by the parent's `alignItems`, which is a rule that holds in
 * some layout situations and not others - and when it does not hold, the image
 * pins to the left edge and the tile shows the transparent margin beside the
 * body rather than the body. Stating `left` removes the question: for a crop
 * scaled to S%, centring means `-(S - 100) / 2` percent of the tile's width.
 *
 * Written as complete literals rather than assembled from parts because
 * Tailwind's JIT scans source text for class names - a string built at runtime
 * produces no CSS. Every value here must stay a literal for that reason.
 */
export const TILE_CROP: Record<AvatarSlot, string> = {
  /** The head, centred tightly enough for fringe and silhouette details to read. */
  hair: 'w-[500%] h-[500%] absolute top-[-110%] left-[-200%]',

  /** Chest to waist, which is where a shirt's cut and neckline read. */
  outfit: 'w-[330%] h-[330%] absolute top-[-85%] left-[-115%]',

  /** Waist to knee. Pushed further up the canvas than an outfit. */
  skirt: 'w-[330%] h-[330%] absolute top-[-140%] left-[-115%]',

  /**
   * The shoes.
   *
   * Centred rather than pushed to the foot of the canvas, because shoe artwork
   * is not drawn on the full-body canvas the garments use - it is a tighter
   * crop around the shoes themselves. Offsetting it as though the feet were at
   * 95% of a full body scrolled straight past the artwork and left every tile
   * blank.
   */
  shoes: 'w-[380%] h-[380%] absolute top-[-185%] left-[-140%]',

  /**
   * Torso and thighs.
   *
   * A skin tone covers the whole body, so there is no single feature to frame -
   * what matters is seeing enough *area* to judge the colour. This was the one
   * slot drawn whole (`w-full h-full`), which made every tone a doll-sized
   * silhouette in which the colour was the hardest thing to see.
   */
  bodyColor: 'w-[300%] h-[300%] absolute top-[-85%] left-[-100%]',
};

/**
 * The skin-tone row, which shows whole bodies rather than parts.
 *
 * A tone variant is a complete base body, so it has no band to frame - but it
 * has the same problem `bodyColor` has, and worse: the row exists purely to
 * compare colours, and a whole body drawn 96px tall renders the skin as a few
 * dozen pixels between hair and clothes. Framing the torso is what makes two
 * tones tell apart at a glance.
 *
 * Separate from `TILE_CROP` because a base is not an `AvatarSlot`, and because
 * the two will want re-tuning independently - this one is judged on colour, the
 * `bodyColor` overlay on how it sits over the body beneath.
 */
export const TONE_CROP = 'w-[260%] h-[260%] absolute top-[-55%] left-[-80%]';

/**
 * A thumbnail is drawn whole.
 *
 * Somebody framed it deliberately, so cropping it again would undo that - and
 * the crops below are tuned for full-body canvases, which a thumbnail is not.
 */
export const WHOLE = 'w-full h-full';

/** The crop for one slot, for artwork that has no thumbnail of its own. */
export function cropFor(slot: AvatarSlot): string {
  return TILE_CROP[slot] ?? WHOLE;
}

/**
 * How to frame one asset in a picker tile.
 *
 * The single decision this module exists to make. An uploaded thumbnail is
 * shown as it was framed; anything else is a full-body canvas and gets cropped
 * to the band its slot occupies.
 *
 * That makes the crop a *fallback* rather than the mechanism. The crops are one
 * set of numbers applied to every garment in a slot, so they are wrong for any
 * piece cut differently from the ones they were tuned against - a long coat
 * framed like a t-shirt. Uploading a thumbnail is how an admin fixes that
 * without anyone touching this table.
 */
export function framingFor(
  slot: AvatarSlot,
  hasThumbnail?: boolean,
): string {
  return hasThumbnail ? WHOLE : cropFor(slot);
}
