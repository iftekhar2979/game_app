/**
 * Guards the signed-out navigator's screen swap.
 *
 * Registering dispatches `startEmailVerification`, and the OTP screen has to
 * take over from whatever auth screen the user was on. An earlier version
 * selected it with `initialRouteName` on a re-`key`ed navigator; that silently
 * did nothing, because NavigationContainer keeps the previous stack state and
 * the navigator rehydrates it instead of reading `initialRouteName`. The user
 * stayed on Create account with a verification email already sent.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';
import { store } from '../src/store';
import {
  logout,
  startEmailVerification,
  startPasswordReset,
} from '../src/store/slices/authSlice';

// Create account mounts the date picker, whose NativeEventEmitter has no
// native module to bind to under Jest.
jest.mock('react-native-date-picker', () => () => null);

// SafeAreaProvider renders nothing until a native onLayout reports insets, and
// no layout event fires under the test renderer - without this the whole tree
// below it is empty.
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    SafeAreaInsetsContext: {
      Provider: ({ children }: any) => children,
      Consumer: ({ children }: any) => children(insets),
    },
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

const visibleText = (node: any): string[] => {
  if (node == null || typeof node === 'boolean') return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(visibleText);
  return visibleText(node.children);
};

const instanceText = (node: any): string => {
  if (typeof node === 'string') return node;
  if (node == null || !node.children) return '';
  return node.children.map(instanceText).join(' ');
};

const renderApp = async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  // Let restoreSession's storage reads settle so the splash spinner clears.
  await act(async () => {});

  return {
    text: () => visibleText(renderer.toJSON()).join(' '),
    dispatch: async (action: any) => {
      await act(async () => {
        store.dispatch(action);
      });
    },
    // Taps the innermost pressable whose label contains `label`, so a test can
    // build up a real navigation stack instead of asserting from the very first
    // screen - the stale state that broke this only exists once the user has
    // pushed at least one screen.
    press: async (label: string) => {
      const matches = renderer.root.findAll(
        (node: any) =>
          typeof node.props?.onPress === 'function' &&
          instanceText(node).includes(label),
        { deep: true },
      );
      if (!matches.length) throw new Error(`No pressable found for "${label}"`);
      await act(async () => {
        matches[matches.length - 1].props.onPress();
      });
    },
    unmount: () => act(() => renderer.unmount()),
  };
};

describe('signed-out navigation', () => {
  beforeEach(() => {
    // Start each test from Sign in, the way a returning user opens the app.
    store.dispatch(logout());
  });

  afterEach(() => {
    store.dispatch(logout());
  });

  it('shows the OTP screen once registration starts email verification', async () => {
    const app = await renderApp();

    await app.press('Create account');
    expect(app.text()).toContain('Create account');

    await app.dispatch(
      startEmailVerification({
        token: 'registration-token',
        user: { email: 'new@example.com', fullName: 'New Member' },
      }),
    );

    expect(app.text()).toContain('Verification code');
    expect(app.text()).toContain('new@example.com');
    expect(app.text()).not.toContain('Create account');

    app.unmount();
  });

  it('shows the OTP screen for a password reset, then returns to Sign in', async () => {
    const app = await renderApp();

    await app.dispatch(
      startPasswordReset({ email: 'member@example.com', token: 'otp-token' }),
    );
    expect(app.text()).toContain('Verification code');

    await app.dispatch(logout());
    expect(app.text()).toContain('Sign in');
    expect(app.text()).not.toContain('Verification code');

    app.unmount();
  });
});
