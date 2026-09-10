import React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import TestRenderer, { act } from 'react-test-renderer';

import {
  Skeleton,
  SkeletonRegion,
  SkeletonText,
} from '../src/components/Skeleton/Skeleton';
import { PostCardSkeleton } from '../src/components/Skeleton/PostCardSkeleton';
import {
  LeagueChatSkeleton,
  LeagueDetailSkeleton,
  LeagueListSkeleton,
} from '../src/components/Skeleton/LeagueSkeletons';
import {
  ContestDetailSkeleton,
  LineupSkeleton,
} from '../src/components/Skeleton/DfsSkeletons';
import {
  EventDetailSkeleton,
  EventListSkeleton,
} from '../src/components/Skeleton/EventSkeletons';
import {
  acquireSweep,
  isSweeping,
  sweepHolders,
} from '../src/components/Skeleton/shimmerDriver';
import { textLineWidths } from '../src/components/Skeleton/skeletonText';

/**
 * The shimmer, held to its three promises.
 *
 * It has to stop (a loop nobody stopped keeps the app awake forever), it has to
 * respect reduce-motion (an endless sweep is exactly what that setting is for),
 * and each block has to paint with its own gradient (shared SVG ids are the
 * failure that makes a skeleton screen go half-blank, and it only shows up when
 * more than one block is on screen - which is always).
 */

const mounted: TestRenderer.ReactTestRenderer[] = [];

const render = (element: React.ReactElement) => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(element);
  });
  mounted.push(tree);
  return tree;
};

afterEach(() => {
  // Unmounting here rather than inline: a test that fails mid-way would
  // otherwise leak its hold on the shared loop and take the next test down
  // with it, hiding which one actually broke.
  act(() => {
    while (mounted.length) mounted.pop()!.unmount();
  });

  // Nothing may outlive the test that started it.
  expect(sweepHolders()).toBe(0);
});

/** Nothing draws until the block knows how wide it is; this is that moment. */
const layout = (
  tree: TestRenderer.ReactTestRenderer,
  size = { width: 200, height: 20 },
) => {
  act(() => {
    for (const view of tree.root.findAllByType(View)) {
      view.props.onLayout?.({ nativeEvent: { layout: { x: 0, y: 0, ...size } } });
    }
  });
};

describe('the shared sweep', () => {
  it('runs one loop no matter how many blocks want it', () => {
    const releaseA = acquireSweep();
    const releaseB = acquireSweep();

    expect(sweepHolders()).toBe(2);
    expect(isSweeping()).toBe(true);

    // Still wanted by B, so it must not stop here.
    releaseA();
    expect(isSweeping()).toBe(true);

    releaseB();
    expect(isSweeping()).toBe(false);
  });

  it('survives a release being called twice', () => {
    // A double effect teardown must not drive the count negative - that would
    // leave a later `acquire` at zero holders and never start the loop again.
    const release = acquireSweep();
    const other = acquireSweep();

    release();
    release();
    release();

    expect(sweepHolders()).toBe(1);
    expect(isSweeping()).toBe(true);

    other();
    expect(sweepHolders()).toBe(0);
  });

  it('stops when the last skeleton unmounts', () => {
    const tree = render(<Skeleton width={120} height={12} />);
    layout(tree);

    expect(isSweeping()).toBe(true);

    act(() => {
      mounted.pop();
      tree.unmount();
    });

    expect(isSweeping()).toBe(false);
  });
});

describe('a block', () => {
  it('draws nothing until it has been measured', () => {
    // Width zero means a sweep with nowhere to travel; rendering the gradient
    // then would paint a stationary band down the left edge.
    const tree = render(<Skeleton width="100%" height={12} />);

    expect(tree.root.findAllByType(Svg)).toHaveLength(0);

    layout(tree);

    expect(tree.root.findAllByType(Svg)).toHaveLength(1);
  });

  it('gives every block its own gradient', () => {
    const tree = render(
      <>
        <Skeleton width={100} height={10} />
        <Skeleton width={100} height={10} />
        <Skeleton width={100} height={10} />
      </>,
    );
    layout(tree);

    const ids = tree.root
      .findAllByType(Rect)
      .map((rect) => String(rect.props.fill));

    expect(ids).toHaveLength(3);
    expect(ids.every((id) => /^url\(#skeleton-sweep-.+\)$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it('is invisible to a screen reader, so the region speaks for it', () => {
    const tree = render(<Skeleton width={100} height={10} />);

    const block = tree.root.findAllByType(View)[0];

    expect(block.props.accessibilityElementsHidden).toBe(true);
    expect(block.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

describe('reduce motion', () => {
  const enabled = (value: boolean) =>
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(value as never);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the blocks but drops the sweep', async () => {
    enabled(true);

    const tree = render(<Skeleton width={100} height={10} />);
    // Let the accessibility query settle before asserting on what it changed.
    await act(async () => {});
    layout(tree);

    // The shape of what is coming is the useful part, so the block stays...
    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0);
    // ...and nothing animates.
    expect(tree.root.findAllByType(Svg)).toHaveLength(0);
    expect(isSweeping()).toBe(false);
  });

  it('animates when the reader has not asked it not to', async () => {
    enabled(false);

    const tree = render(<Skeleton width={100} height={10} />);
    await act(async () => {});
    layout(tree);

    expect(tree.root.findAllByType(Svg)).toHaveLength(1);
    expect(isSweeping()).toBe(true);
  });
});

describe('text lines', () => {
  it('cuts the last one short, so a stack of bars reads as a sentence', () => {
    expect(textLineWidths(3)).toEqual(['100%', '100%', '55%']);
  });

  it('shortens a lone line too', () => {
    // On its own a full-width bar is indistinguishable from a rule or an image
    // placeholder - which is the confusion the short line exists to avoid.
    expect(textLineWidths(1)).toEqual(['55%']);
  });

  it('honours a caller that wants a different tail', () => {
    expect(textLineWidths(2, 0.8)).toEqual(['100%', '80%']);
  });

  it('returns nothing rather than throwing on nonsense', () => {
    for (const lines of [0, -3, NaN]) {
      expect(textLineWidths(lines)).toEqual([]);
    }
  });

  it('renders one block per line', () => {
    const tree = render(<SkeletonText lines={3} />);
    layout(tree);

    expect(tree.root.findAllByType(Svg)).toHaveLength(3);
  });
});

describe('a skeleton region', () => {
  it('states the wait once, in words', () => {
    const tree = render(
      <SkeletonRegion label="Loading posts">
        <Skeleton width={100} height={10} />
      </SkeletonRegion>,
    );

    const region = tree.root.findAllByType(View)[0];

    expect(region.props.accessible).toBe(true);
    expect(region.props.accessibilityLabel).toBe('Loading posts');
    expect(region.props.accessibilityState).toEqual({ busy: true });
  });
});

describe('the feed card placeholder', () => {
  /**
   * These numbers are the promise a skeleton makes. `PostCard` lays out a 36px
   * author avatar and a 300px image, and if the placeholder disagrees the page
   * jumps the moment the real card arrives - which is worse than the spinner
   * this replaced.
   */
  const sizesIn = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAllByType(View).map((view) => {
      const style = Array.isArray(view.props.style)
        ? Object.assign({}, ...view.props.style.filter(Boolean))
        : view.props.style;
      return style || {};
    });

  it('reserves the author avatar at the size the real one uses', () => {
    const tree = render(<PostCardSkeleton />);

    expect(
      sizesIn(tree).some((s) => s.width === 36 && s.height === 36 && s.borderRadius === 18),
    ).toBe(true);
  });

  it('reserves the image at the height the real one uses', () => {
    const tree = render(<PostCardSkeleton />);

    expect(sizesIn(tree).some((s) => s.height === 300)).toBe(true);
  });

  it('leaves the image slot out when told the post has none', () => {
    // A 300px gap that never fills is a page that collapses on arrival.
    const tree = render(<PostCardSkeleton withImage={false} />);

    expect(sizesIn(tree).some((s) => s.height === 300)).toBe(false);
  });
});

describe('the league placeholders', () => {
  const blocks = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAllByType(View).map((view) => {
      const style = Array.isArray(view.props.style)
        ? Object.assign({}, ...view.props.style.filter(Boolean))
        : view.props.style;
      return style || {};
    });

  it('draws the tab strip, not just the card above it', () => {
    // The tabs are the control the reader reaches for first. Leaving them out
    // makes the page appear to grow a toolbar the moment the league lands.
    const tree = render(<LeagueDetailSkeleton />);

    const pills = blocks(tree).filter((s) => s.height === 34);

    expect(pills.length).toBe(4);
  });

  it('gives the league logo the size the real one uses', () => {
    const tree = render(<LeagueDetailSkeleton />);

    expect(blocks(tree).some((s) => s.width === 56 && s.height === 56)).toBe(true);
  });

  it('puts an avatar beside other people’s messages and none beside your own', () => {
    // A column of identical bubbles reads as a list; the avatar on one side
    // only is what makes it read as a conversation.
    const tree = render(<LeagueChatSkeleton count={6} />);

    const avatars = blocks(tree).filter(
      (s) => s.width === 32 && s.height === 32 && s.borderRadius === 16,
    );

    // Six bubbles, two of them the reader's own (index % 3 === 1).
    expect(avatars).toHaveLength(4);
  });

  it('varies the bubble widths, so it does not read as a table', () => {
    const tree = render(<LeagueChatSkeleton count={6} />);

    const bubbles = blocks(tree)
      .filter((s) => s.height === 40 && s.borderRadius === 18)
      .map((s) => s.width);

    expect(bubbles).toHaveLength(6);
    expect(new Set(bubbles).size).toBeGreaterThan(1);
  });

  it('asks for one row per league and no more', () => {
    const tree = render(<LeagueListSkeleton count={3} />);

    // The 48px logo is one per row.
    const logos = blocks(tree).filter((s) => s.width === 48 && s.height === 48);

    expect(logos).toHaveLength(3);
  });

  it('refuses to render an empty list of rows', () => {
    // A count of zero would silently produce a blank screen that never
    // resolves into anything - worse than a spinner.
    const tree = render(<LeagueListSkeleton count={0} />);

    expect(blocks(tree).some((s) => s.width === 48 && s.height === 48)).toBe(true);
  });
});

describe('the event and daily-fantasy placeholders', () => {
  const blocks = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAllByType(View).map((view) => {
      const style = Array.isArray(view.props.style)
        ? Object.assign({}, ...view.props.style.filter(Boolean))
        : view.props.style;
      return style || {};
    });

  it('wraps some event titles to two lines and not others', () => {
    // Competition names are long enough to wrap, so the placeholder wraps too -
    // otherwise the real card pushes the whole list down on arrival. A column
    // where every title wraps is just as wrong: it reads as a pattern.
    const tree = render(<EventListSkeleton count={4} />);

    const titleLines = blocks(tree).filter((s) => s.height === 16);

    // Four cards: two single-line, two wrapped.
    expect(titleLines).toHaveLength(6);
  });

  it('draws the division chips, which scroll in a row of their own', () => {
    // Omitting them makes a whole row appear from nowhere mid-scroll.
    const tree = render(<EventDetailSkeleton />);

    const chips = blocks(tree).filter((s) => [112, 96, 128].includes(s.width));

    expect(chips).toHaveLength(3);
  });

  it('keeps the contest button in the skeleton', () => {
    // It is the reason the reader opened the screen; stopping above it makes
    // the page look shorter than it turns out to be.
    const tree = render(<ContestDetailSkeleton />);

    expect(blocks(tree).some((s) => s.height === 52)).toBe(true);
  });

  it('draws the salary bar before the spots', () => {
    // The bar is the constraint every choice below it is measured against.
    const tree = render(<LineupSkeleton slots={3} />);

    const styles = blocks(tree);
    const bar = styles.findIndex((s) => s.borderTopLeftRadius === 20);
    const firstSlot = styles.findIndex((s) => s.width === 42 && s.height === 42);

    expect(bar).toBeGreaterThanOrEqual(0);
    expect(firstSlot).toBeGreaterThan(bar);
  });

  it('asks for one row per lineup spot', () => {
    const tree = render(<LineupSkeleton slots={3} />);

    expect(blocks(tree).filter((s) => s.width === 42 && s.height === 42)).toHaveLength(3);
  });
});
