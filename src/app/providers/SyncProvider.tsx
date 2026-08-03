import { useEffect } from 'react';
import type { ReactNode } from 'react';

import type { AppError } from '@/domain/errors';
import { dateTagRepository, memoryRepository, tagRepository } from '@/infrastructure/firebase';
import { useDateTagsStore, useMemoriesStore, useSessionStore, useTagsStore } from '@/store';

import { useAuth } from './authContext';

/**
 * Opens and closes the Firestore listeners that feed the local read model.
 *
 * The whole collection is streamed, unfiltered, for each of the three
 * collections. That sounds extravagant and is not: with IndexedDB persistence a
 * cold start reads from disk and only fetches what changed, and in exchange
 * every filter, sort, random draw and full-text query in the app runs locally,
 * instantly, with no composite index to maintain.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const { startSession, endSession, setStatus, setError, setFromCache } =
      useSessionStore.getState();

    if (user === null) {
      // Signing out must leave nothing behind: the next user on this device
      // would otherwise see the previous one's memories for a frame.
      useMemoriesStore.getState().reset();
      useTagsStore.getState().reset();
      useDateTagsStore.getState().reset();
      endSession();
      return;
    }

    startSession(user.id);

    const onError = (error: AppError) => {
      console.error('[sync] Synchronisation interrompue.', error);
      setError(error);
    };

    const unsubscribers = [
      memoryRepository.observeAll(user.id, {
        onSnapshot: ({ changes, fromCache }) => {
          useMemoriesStore.getState().applyChanges(changes);
          setFromCache(fromCache);
          markReadyWhenLoaded(setStatus);
        },
        onError,
      }),

      tagRepository.observeAll(user.id, {
        onSnapshot: ({ changes }) => {
          useTagsStore.getState().applyChanges(changes);
          markReadyWhenLoaded(setStatus);
        },
        onError,
      }),

      dateTagRepository.observeAll(user.id, {
        onSnapshot: ({ changes }) => {
          useDateTagsStore.getState().applyChanges(changes);
          markReadyWhenLoaded(setStatus);
        },
        onError,
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [user]);

  return children;
}

/** Ready only once all three collections have delivered their first snapshot. */
function markReadyWhenLoaded(setStatus: (status: 'ready') => void): void {
  const loaded =
    useMemoriesStore.getState().loaded &&
    useTagsStore.getState().loaded &&
    useDateTagsStore.getState().loaded;

  if (loaded) setStatus('ready');
}
