import {
  applyTintMatrix,
  hexToTintMatrix,
  luminance,
} from '../src/avatar/hairTint';
import { HAIR_COLORS } from '../src/avatar/registry';

/**
 * Measured from the shipped artwork by decoding the PNGs and averaging opaque
 * pixels. The hair is drawn near-black, which is what defeated the old
 * multiply-only matrix.
 */
const BLACK_HAIR: [number, number, number] = [18, 18, 18];
const DARK_HAIR: [number, number, number] = [16, 11, 13];
const FEMALE_HAIR: [number, number, number] = [92, 65, 64];

const render = (hex: string, source: [number, number, number]) =>
  applyTintMatrix(hexToTintMatrix(hex), source);

const spread = (source: [number, number, number]) => {
  const lums = HAIR_COLORS.map((hex) => luminance(render(hex, source)));
  return Math.max(...lums) - Math.min(...lums);
};

describe('the regression: six colours that all looked black', () => {
  // The old matrix produced a spread of ~11/255 on this artwork. Anything in
  // that range is indistinguishable on a phone, which is exactly what the
  // client reported.
  it('separates the offered colours on near-black hair', () => {
    expect(spread(BLACK_HAIR)).toBeGreaterThan(60);
  });

  it('separates them on the darkest hair asset too', () => {
    expect(spread(DARK_HAIR)).toBeGreaterThan(60);
  });

  it('separates them on the lighter female artwork', () => {
    expect(spread(FEMALE_HAIR)).toBeGreaterThan(60);
  });

  // Gold and white differed by one unit per channel before; they are the pair
  // most likely to collapse back together.
  it('keeps gold clearly distinct from white', () => {
    const gold = luminance(render('#E6C27A', BLACK_HAIR));
    const white = luminance(render('#E6E6E6', BLACK_HAIR));
    expect(Math.abs(white - gold)).toBeGreaterThan(10);
  });

  it('makes a light tint visibly lighter than a dark one', () => {
    const light = luminance(render('#E6E6E6', BLACK_HAIR));
    const dark = luminance(render('#1A1A1A', BLACK_HAIR));
    expect(light - dark).toBeGreaterThan(60);
  });

  it('renders every offered colour distinctly from every other', () => {
    const lums = HAIR_COLORS.map((hex) => luminance(render(hex, BLACK_HAIR)));
    const rendered = HAIR_COLORS.map((hex) => render(hex, BLACK_HAIR).join(','));
    expect(new Set(rendered).size).toBe(HAIR_COLORS.length);
    expect(Math.min(...lums)).toBeGreaterThan(0);
  });
});

describe('hue is carried, not just brightness', () => {
  it('tints red artwork red and gold artwork gold', () => {
    const [r, , b] = render('#A33327', BLACK_HAIR);
    expect(r).toBeGreaterThan(b);

    const [gr, gg, gb] = render('#E6C27A', BLACK_HAIR);
    expect(gr).toBeGreaterThan(gg);
    expect(gg).toBeGreaterThan(gb);
  });

  // The offset column is what the old matrix was missing entirely.
  it('carries the tint in the offset column', () => {
    const offsets = hexToTintMatrix('#E6C27A')
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((_, i) => i % 5 === 4)
      .slice(0, 3);
    expect(offsets.every((o) => o > 0)).toBe(true);
  });

  it('preserves alpha so only the hair is painted', () => {
    const parts = hexToTintMatrix('#E6C27A').trim().split(/\s+/).map(Number);
    expect(parts.slice(15)).toEqual([0, 0, 0, 1, 0]);
  });

  it('keeps source shading readable rather than flattening the hair', () => {
    const lit = render('#8D5B36', [200, 200, 200]);
    const shadow = render('#8D5B36', [20, 20, 20]);
    expect(luminance(lit) - luminance(shadow)).toBeGreaterThan(20);
  });
});

describe('bad input', () => {
  it('leaves artwork untouched rather than blacking it out', () => {
    const identity = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';
    expect(hexToTintMatrix('nonsense')).toBe(identity);
    expect(hexToTintMatrix('')).toBe(identity);
    expect(hexToTintMatrix(null)).toBe(identity);
    expect(hexToTintMatrix(undefined)).toBe(identity);
    expect(applyTintMatrix(identity, BLACK_HAIR)).toEqual(BLACK_HAIR);
  });

  it('accepts a hex with or without the hash', () => {
    expect(hexToTintMatrix('E6C27A')).toBe(hexToTintMatrix('#E6C27A'));
  });

  it('never produces a channel outside 0-255', () => {
    for (const hex of [...HAIR_COLORS, '#FFFFFF', '#000000']) {
      for (const src of [[0, 0, 0], [255, 255, 255], BLACK_HAIR] as const) {
        for (const c of render(hex, src as [number, number, number])) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(255);
        }
      }
    }
  });
});
