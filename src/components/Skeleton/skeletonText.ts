/**
 * What makes a stack of grey bars read as *text* rather than as an image.
 *
 * A paragraph almost never fills its last line, so a skeleton whose lines are
 * all the same width reads as a block - a thumbnail, a card, a divider. Cutting
 * the last one short is the single cue that says "words are coming".
 */

/** The short last line, as a fraction of the full width. */
export const LAST_LINE = 0.55;

/**
 * Widths for `lines` placeholder rows, as percentage strings.
 *
 * A single line takes the short width too: on its own, a full-width bar is
 * indistinguishable from a rule or an image placeholder, which is exactly the
 * confusion this is here to avoid.
 */
export function textLineWidths(lines: number, lastLine: number = LAST_LINE): string[] {
  if (!Number.isFinite(lines) || lines <= 0) return [];

  const count = Math.floor(lines);
  const short = `${Math.round(clamp(lastLine, 0.1, 1) * 100)}%`;

  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? short : '100%',
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
