// @ts-ignore
import { io, Socket } from 'socket.io-client/dist/socket.io.js';
import { API_URL } from '../config';
import { authStorage } from './authStorage';

export const getSocketBaseUrl = (): string => {
  try {
    const cleaned = API_URL.replace(/\/api\/v1\/?$/, '');
    return cleaned;
  } catch (e) {
    return 'https://iftek7500.ilmifygroup.com';
  }
};

let socketInstance: Socket | null = null;
const leagueRoomReferences = new Map<string, number>();

// Socket.IO treats a handshake rejected by server middleware as fatal and stops
// reconnecting on its own, so an expired access token would otherwise kill
// realtime for the rest of the app session. We retry those by hand, and the
// `auth` callback below re-reads the token on every attempt so a refreshed one
// is picked up automatically.
const AUTH_RETRY_BASE_DELAY = 2000;
const AUTH_RETRY_MAX_DELAY = 30000;
let authRetryAttempts = 0;
let authRetryTimer: ReturnType<typeof setTimeout> | null = null;

const cancelAuthRetry = () => {
  if (authRetryTimer) {
    clearTimeout(authRetryTimer);
    authRetryTimer = null;
  }
};

const scheduleAuthRetry = () => {
  if (authRetryTimer || !socketInstance) return;
  const delay = Math.min(
    AUTH_RETRY_BASE_DELAY * 2 ** authRetryAttempts,
    AUTH_RETRY_MAX_DELAY,
  );
  authRetryAttempts += 1;
  authRetryTimer = setTimeout(async () => {
    authRetryTimer = null;
    if (!socketInstance || socketInstance.connected) return;
    const token = await authStorage.getAccessToken();
    if (!token) {
      scheduleAuthRetry();
      return;
    }
    socketInstance.connect();
  }, delay);
};

const rejoinKnownRooms = () => {
  leagueRoomReferences.forEach((_count, leagueId) => {
    socketInstance?.emit('joinLeagueRoom', { leagueId });
  });
};

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const baseUrl = getSocketBaseUrl();
    console.log('[SocketService] Connecting to:', baseUrl);

    socketInstance = io(baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      // Called before every connection AND reconnection attempt, so the socket
      // always hands the server the current access token.
      auth: (cb: (data: { token?: string }) => void) => {
        authStorage
          .getAccessToken()
          .then(token => cb({ token: token ? `Bearer ${token}` : undefined }))
          .catch(() => cb({}));
      },
    });

    socketInstance.on('connect', () => {
      console.log('[SocketService] Connected! Socket ID:', socketInstance?.id);
      authRetryAttempts = 0;
      cancelAuthRetry();
      // The server auto-joins every league the user belongs to, but re-emitting
      // is cheap and covers rooms joined before the membership existed.
      rejoinKnownRooms();
    });

    socketInstance.on('connect_error', (err: any) => {
      const message = err?.message || String(err);
      console.warn('[SocketService] Socket connection error:', message);
      // `active === false` means Socket.IO gave up (middleware rejection).
      if (socketInstance && socketInstance.active === false) {
        scheduleAuthRetry();
      }
    });

    socketInstance.on('leagueRoomError', (payload: any) => {
      console.warn(
        '[SocketService] League room rejected:',
        payload?.leagueId,
        payload?.message,
      );
    });

    socketInstance.on('disconnect', (reason: any) => {
      console.log('[SocketService] Disconnected:', reason);
      // The server dropped us on purpose; Socket.IO will not retry by itself.
      if (reason === 'io server disconnect') scheduleAuthRetry();
    });
  }

  if (!socketInstance.connected && !socketInstance.active) {
    socketInstance.connect();
  }
  return socketInstance;
};

export const joinLeagueRoom = (leagueId: string) => {
  if (!leagueId) return;
  const s = getSocket();
  const currentReferences = leagueRoomReferences.get(leagueId) || 0;
  leagueRoomReferences.set(leagueId, currentReferences + 1);
  // Joining a room is idempotent server-side, so emit whenever we are online
  // rather than only on the first reference - a screen must never end up
  // listening to a room the socket silently left.
  if (s.connected) {
    console.log('[SocketService] Emitting joinLeagueRoom for:', leagueId);
    s.emit('joinLeagueRoom', { leagueId });
  }
};

export const leaveLeagueRoom = (leagueId: string) => {
  if (!leagueId) return;
  const currentReferences = leagueRoomReferences.get(leagueId) || 0;
  if (currentReferences > 1) {
    leagueRoomReferences.set(leagueId, currentReferences - 1);
    return;
  }
  leagueRoomReferences.delete(leagueId);
  if (socketInstance?.connected) {
    console.log('[SocketService] Emitting leaveLeagueRoom for:', leagueId);
    socketInstance.emit('leaveLeagueRoom', { leagueId });
  }
};

/**
 * Reconnects with a freshly stored token. Call this right after login or a
 * token refresh so realtime resumes without waiting for the retry backoff.
 */
export const reconnectSocketWithCurrentToken = () => {
  cancelAuthRetry();
  authRetryAttempts = 0;
  if (!socketInstance) {
    getSocket();
    return;
  }
  socketInstance.disconnect();
  socketInstance.connect();
};

/** Tears the socket down on logout so the next user starts clean. */
export const disconnectSocket = () => {
  cancelAuthRetry();
  authRetryAttempts = 0;
  leagueRoomReferences.clear();
  socketInstance?.disconnect();
};
