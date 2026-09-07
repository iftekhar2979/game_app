/**
 * Builds the `feColorMatrix` used to recolour the hair layer.
 *
 * The previous matrix was a pure diagonal scale with no offset column:
 *
 *     R' = (0.25 + 0.75 * r) * R_source
 *
 * so every output channel was bounded above by its source channel. The hair
 * artwork averages 16-18 out of 255 (it is drawn near-black), which meant all
 * six offered colours rendered between 6 and 17 - a ~4% luminance spread, far
 * below what an eye can pick out. The value reached the renderer correctly; the
 * maths simply could not express the change, so tapping the swatches did
 * nothing visible.
 *
 * Brightness now comes from the source's luminance and hue comes from the tint,
 * carried in the offset column that used to be zero. That lets near-black
 * artwork take a colour while its shading still shows through.
 */

/** Rec. 709 luma weights - how much each channel contributes to brightness. */
const LUMA = [0.2126, 0.7152, 0.0722] as const;

/**
 * How much of the source's own shading survives, against the flat tint.
 *
 * At 0 the hair becomes a flat silhouette of the chosen colour; at 1 it is the
 * original artwork again and nothing changes. Half keeps the strand shading
 * readable while still letting a light tint lift near-black art well clear of
 * black.
 */
export const TINT_DETAIL = 0.5;

const IDENTITY = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';

/**
 * @param hex `#rrggbb` (with or without the hash). Anything else yields the
 * identity matrix, so a bad value leaves the artwork untouched rather than
 * rendering it black.
 */
export function hexToTintMatrix(hex: string | null | undefined): string {
  const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex ?? '');
  if (!parsed) return IDENTITY;

  const [r, g, b] = [1, 2, 3].map((i) => parseInt(parsed[i], 16) / 255);
  const k = TINT_DETAIL;

  // Each row: luma of the source scaled by k, plus the tint channel in the
  // offset column. The alpha row is left alone so transparency is preserved -
  // without that the whole stage would be painted, not just the hair.
  const row = (channel: number) =>
    `${LUMA[0] * k} ${LUMA[1] * k} ${LUMA[2] * k} 0 ${channel * (1 - k)}`;

  return `${row(r)}  ${row(g)}  ${row(b)}  0 0 0 1 0`;
}

/**
 * The colour this matrix produces for one source pixel, as 0-255 channels.
 *
 * Exists so tests can assert the visible outcome rather than the matrix text -
 * the old matrix was perfectly well-formed and still produced six identical
 * blacks.
 */
export function applyTintMatrix(
  matrix: string,
  source: [number, number, number],
): [number, number, number] {
  const n = matrix.trim().split(/\s+/).map(Number);
  const [sr, sg, sb] = source.map((c) => c / 255);

  const channel = (rowIndex: number) => {
    const o = rowIndex * 5;
    const value = n[o] * sr + n[o + 1] * sg + n[o + 2] * sb + n[o + 4];
    return Math.round(Math.min(1, Math.max(0, value)) * 255);
  };

  return [channel(0), channel(1), channel(2)];
}

/** Perceived brightness of an RGB triple, 0-255. */
export function luminance([r, g, b]: [number, number, number]): number {
  return LUMA[0] * r + LUMA[1] * g + LUMA[2] * b;
}
