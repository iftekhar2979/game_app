import React from 'react';
import { Image } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import ArtworkImage from '../src/components/Avatar/ArtworkImage';

/**
 * The parachute, exercised.
 *
 * `assetSource` decides *what* a layer's fallback is; this decides *when* it is
 * used. The switch only ever fires on a failed download, which is precisely the
 * path no manual test session reliably reaches, so it is pinned here.
 */

const BUNDLED = 42; // a require() handle is an opaque number at runtime
const REMOTE = { uri: 'https://cdn.example.com/hair6.png' };

const render = (element: React.ReactElement) => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(element);
  });
  return tree;
};

const imageOf = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Image)[0];

const failIt = (tree: TestRenderer.ReactTestRenderer) => {
  act(() => {
    imageOf(tree).props.onError?.();
  });
};

describe('ArtworkImage', () => {
  it('draws the remote artwork while it is loading fine', () => {
    const tree = render(<ArtworkImage source={REMOTE} fallback={BUNDLED} />);

    expect(imageOf(tree).props.source).toEqual(REMOTE);
  });

  it('swaps to the bundled copy once the download fails', () => {
    const tree = render(<ArtworkImage source={REMOTE} fallback={BUNDLED} />);

    failIt(tree);

    expect(imageOf(tree).props.source).toBe(BUNDLED);
  });

  /**
   * A bundled handle cannot fail, so wiring an error handler to it would only
   * create a path that can never be taken.
   */
  it('attaches no error handler to bundled artwork', () => {
    const tree = render(<ArtworkImage source={BUNDLED} fallback={BUNDLED} />);

    expect(imageOf(tree).props.onError).toBeUndefined();
  });

  it('stops listening for errors once it has fallen back', () => {
    const tree = render(<ArtworkImage source={REMOTE} fallback={BUNDLED} />);

    failIt(tree);

    expect(imageOf(tree).props.onError).toBeUndefined();
  });

  it('renders nothing when a failed remote layer has no fallback', () => {
    const tree = render(<ArtworkImage source={REMOTE} fallback={null} />);

    failIt(tree);

    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });

  it('renders nothing when there is no artwork at all', () => {
    const tree = render(<ArtworkImage source={null} fallback={null} />);

    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });

  it('falls straight through to the bundled copy when there is no remote one', () => {
    const tree = render(<ArtworkImage source={null} fallback={BUNDLED} />);

    expect(imageOf(tree).props.source).toBe(BUNDLED);
  });

  /**
   * Replaced artwork arrives as a new URL. The previous failure says nothing
   * about it, so the layer has to try again rather than stay parachuted for the
   * life of the screen.
   */
  it('retries when the artwork is replaced by a different URL', () => {
    const tree = render(<ArtworkImage source={REMOTE} fallback={BUNDLED} />);
    failIt(tree);
    expect(imageOf(tree).props.source).toBe(BUNDLED);

    const replaced = { uri: 'https://cdn.example.com/hair6.v2.png' };
    act(() => {
      tree.update(<ArtworkImage source={replaced} fallback={BUNDLED} />);
    });

    expect(imageOf(tree).props.source).toEqual(replaced);
  });

  it('stays fallen back while the same URL is re-rendered', () => {
    const tree = render(<ArtworkImage source={REMOTE} fallback={BUNDLED} />);
    failIt(tree);

    act(() => {
      tree.update(<ArtworkImage source={{ ...REMOTE }} fallback={BUNDLED} />);
    });

    expect(imageOf(tree).props.source).toBe(BUNDLED);
  });

  it('passes presentation props through untouched', () => {
    const tree = render(
      <ArtworkImage source={REMOTE} fallback={BUNDLED} resizeMode="contain" testID="layer" />,
    );

    expect(imageOf(tree).props.resizeMode).toBe('contain');
    expect(imageOf(tree).props.testID).toBe('layer');
  });
});
