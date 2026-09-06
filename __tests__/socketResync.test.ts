import { subscribeToResync } from '../src/services/socketService';

/** Minimal stand-in for the socket, so the state machine is testable alone. */
const makeSocket = (connected: boolean) => {
  const handlers: Record<string, Array<() => void>> = {};
  return {
    connected,
    on: (event: string, handler: () => void) => {
      (handlers[event] ||= []).push(handler);
    },
    off: (event: string, handler: () => void) => {
      handlers[event] = (handlers[event] || []).filter(h => h !== handler);
    },
    fire: (event: string) => (handlers[event] || []).forEach(h => h()),
    listenerCount: (event: string) => (handlers[event] || []).length,
  };
};

describe('socket resync', () => {
  it('does not resync a connection that never dropped', () => {
    const socket = makeSocket(true);
    const onResync = jest.fn();

    subscribeToResync(socket, onResync);
    socket.fire('connect');

    expect(onResync).not.toHaveBeenCalled();
  });

  it('resyncs once after a disconnect and reconnect', () => {
    const socket = makeSocket(true);
    const onResync = jest.fn();

    subscribeToResync(socket, onResync);
    socket.fire('disconnect');
    socket.fire('connect');

    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('does not resync again until another gap occurs', () => {
    const socket = makeSocket(true);
    const onResync = jest.fn();

    subscribeToResync(socket, onResync);
    socket.fire('disconnect');
    socket.fire('connect');
    socket.fire('connect');

    expect(onResync).toHaveBeenCalledTimes(1);

    socket.fire('disconnect');
    socket.fire('connect');

    expect(onResync).toHaveBeenCalledTimes(2);
  });

  // Subscribing while already offline means events may have been missed before
  // anyone was listening, so the first connect still counts as a gap.
  it('treats subscribing while disconnected as a missed window', () => {
    const socket = makeSocket(false);
    const onResync = jest.fn();

    subscribeToResync(socket, onResync);
    socket.fire('connect');

    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it('detaches both listeners on unsubscribe', () => {
    const socket = makeSocket(true);
    const onResync = jest.fn();

    const stop = subscribeToResync(socket, onResync);
    stop();

    expect(socket.listenerCount('connect')).toBe(0);
    expect(socket.listenerCount('disconnect')).toBe(0);

    socket.fire('disconnect');
    socket.fire('connect');
    expect(onResync).not.toHaveBeenCalled();
  });
});
