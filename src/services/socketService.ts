// @ts-ignore
import { io, Socket } from 'socket.io-client/dist/socket.io.js';
import { API_URL } from '../config';

export const getSocketBaseUrl = (): string => {
  try {
    const cleaned = API_URL.replace(/\/api\/v1\/?$/, '');
    return cleaned;
  } catch (e) {
    return 'https://iftek7500.ilmifygroup.com';
  }
};

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const baseUrl = getSocketBaseUrl();
    console.log('[SocketService] Connecting to:', baseUrl);

    socketInstance = io(baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('[SocketService] Connected! Socket ID:', socketInstance?.id);
    });

    socketInstance.on('connect_error', (err: any) => {
      console.warn('[SocketService] Socket connection error:', err?.message || err);
    });

    socketInstance.on('disconnect', (reason: any) => {
      console.log('[SocketService] Disconnected:', reason);
    });
  }
  return socketInstance;
};


export const joinLeagueRoom = (leagueId: string) => {
  if (!leagueId) return;
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  console.log('[SocketService] Emitting joinLeagueRoom for:', leagueId);
  s.emit('joinLeagueRoom', { leagueId });
};

export const leaveLeagueRoom = (leagueId: string) => {
  if (!leagueId) return;
  if (socketInstance) {
    console.log('[SocketService] Emitting leaveLeagueRoom for:', leagueId);
    socketInstance.emit('leaveLeagueRoom', { leagueId });
  }
};
