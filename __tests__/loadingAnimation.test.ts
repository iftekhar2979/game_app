import animation from '../src/assets/animations/loading.json';

/**
 * The loading animation asset.
 *
 * A Lottie file is data, and a malformed one fails at runtime by rendering
 * nothing - a blank screen where the loading state should be, which looks like
 * the app has hung rather than like a broken asset. These check the structure
 * the player actually requires.
 */

const layers = (animation as any).layers ?? [];

describe('the loading animation', () => {
  it('declares the frame range and rate a player needs', () => {
    expect((animation as any).fr).toBeGreaterThan(0);
    expect((animation as any).op).toBeGreaterThan((animation as any).ip);
    expect((animation as any).w).toBeGreaterThan(0);
    expect((animation as any).h).toBeGreaterThan(0);
  });

  it('has both rings', () => {
    expect(layers.map((layer: any) => layer.nm).sort()).toEqual(['inner', 'outer']);
  });

  it('gives every layer a unique index', () => {
    const indices = layers.map((layer: any) => layer.ind);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('keeps every layer inside the composition it loops over', () => {
    // A layer whose range falls outside the comp simply never draws.
    for (const layer of layers) {
      expect(layer.ip).toBeGreaterThanOrEqual((animation as any).ip);
      expect(layer.op).toBeLessThanOrEqual((animation as any).op);
    }
  });

  it('animates: it is not a still frame with a spinner name', () => {
    for (const layer of layers) {
      // Rotation is what makes it read as loading rather than as an icon.
      expect(layer.ks.r.a).toBe(1);
      expect(layer.ks.r.k.length).toBeGreaterThan(1);
    }
  });

  it('turns a full circle, so the loop has no visible seam', () => {
    for (const layer of layers) {
      const [first, last] = [layer.ks.r.k[0], layer.ks.r.k[layer.ks.r.k.length - 1]];
      expect(Math.abs(last.s[0] - first.s[0])).toBe(360);
    }
  });

  it('sweeps the arc rather than spinning a fixed one', () => {
    for (const layer of layers) {
      const trim = layer.shapes[0].it.find((item: any) => item.ty === 'tm');
      expect(trim).toBeDefined();
      expect(trim.s.a).toBe(1);
      expect(trim.e.a).toBe(1);
    }
  });

  it('strokes in the app’s own colours, not a stock palette', () => {
    const colours = layers.map((layer: any) => {
      const stroke = layer.shapes[0].it.find((item: any) => item.ty === 'st');
      return stroke.c.k.slice(0, 3).map((channel: number) => Math.round(channel * 255));
    });

    expect(colours).toContainEqual([224, 181, 102]); // #E0B566, the auth gold
    expect(colours).toContainEqual([179, 102, 255]); // #B366FF, the avatar purple
  });

  it('gives each ring a visible stroke', () => {
    for (const layer of layers) {
      const stroke = layer.shapes[0].it.find((item: any) => item.ty === 'st');
      expect(stroke.w.k).toBeGreaterThan(0);
      expect(stroke.o.k).toBeGreaterThan(0);
    }
  });
});
