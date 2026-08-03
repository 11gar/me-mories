import { create } from 'zustand';

import type { AppError } from '@/domain/errors';
import type { UserId } from '@/domain/models';

export type SyncStatus = 'idle' | 'syncing' | 'ready' | 'error';

interface SessionState {
  userId: UserId | null;
  status: SyncStatus;
  error: AppError | null;
  /**
   * True while the data on screen comes from the IndexedDB cache alone. Lets the
   * UI say "hors ligne" honestly instead of pretending everything is current.
   */
  fromCache: boolean;

  startSession: (userId: UserId) => void;
  endSession: () => void;
  setStatus: (status: SyncStatus) => void;
  setError: (error: AppError | null) => void;
  setFromCache: (fromCache: boolean) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  userId: null,
  status: 'idle',
  error: null,
  fromCache: false,

  startSession: (userId) => set({ userId, status: 'syncing', error: null }),
  endSession: () => set({ userId: null, status: 'idle', error: null, fromCache: false }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error === null ? 'ready' : 'error' }),
  setFromCache: (fromCache) => set({ fromCache }),
}));

/**
 * The signed-in user's id, for write actions.
 *
 * Every mutation runs from a protected route, so a missing id is a programming
 * error — a loud one beats silently writing to `users/undefined`.
 */
export function requireUserId(): UserId {
  const { userId } = useSessionStore.getState();

  if (userId === null) {
    throw new Error('Aucune session active : cette action requiert un utilisateur connecté.');
  }

  return userId;
}
