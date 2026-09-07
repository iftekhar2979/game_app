import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Modal, View } from 'react-native';
import { ToastContainer } from '../src/components/common/Toast';
import { showToast } from '../src/utils/toast';

const render = () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ToastContainer />);
  });
  return tree;
};

const show = (fn: () => void) => {
  ReactTestRenderer.act(() => {
    fn();
  });
};

describe('ToastContainer', () => {
  it('renders nothing until a toast is raised', () => {
    const tree = render();
    expect(tree.toJSON()).toBeNull();
    tree.unmount();
  });

  it('shows the title and message once raised', () => {
    const tree = render();
    show(() => showToast.success('Drafted', 'Panthers joined your roster'));

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Drafted');
    expect(text).toContain('Panthers joined your roster');
    tree.unmount();
  });

  // The regression: the toast used to render inside a Modal, which is its own
  // native window and swallows every touch on screen. Scrolling and taps were
  // dead for the toast's whole four-second life.
  it('does not mount a Modal, which would block the screen behind it', () => {
    const tree = render();
    show(() => showToast.success('Drafted'));

    expect(tree.root.findAllByType(Modal)).toHaveLength(0);
    tree.unmount();
  });

  it('lets touches fall through the overlay to the app underneath', () => {
    const tree = render();
    show(() => showToast.error('Draft Error', 'Not your turn'));

    // Every View wrapping the card must be transparent to touches, so only the
    // card itself is interactive.
    const overlay = tree.root.findAllByType(View)[0];
    expect(overlay.props.pointerEvents).toBe('box-none');
    tree.unmount();
  });
});
