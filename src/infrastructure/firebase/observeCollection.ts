import { onSnapshot } from 'firebase/firestore';
import type { DocumentData, Query } from 'firebase/firestore';

import type { CollectionChange, ObserveHandlers, Unsubscribe } from '@/domain/repositories';

import { mapFirebaseError } from './errorMapping';

/**
 * Turns a Firestore collection listener into a stream of domain changes.
 *
 * Firestore delivers `docChanges()` — only what moved since the last snapshot —
 * which is exactly what the store and the search index need to stay in sync
 * incrementally rather than rebuilding on every write.
 *
 * A document that fails validation is logged and skipped, never thrown: one bad
 * record must not take down the user's entire collection. It simply disappears
 * from the app until it is fixed, which is the only safe failure mode here.
 */
export function observeCollection<TEntity>(
  query: Query,
  mapDocument: (id: string, data: DocumentData) => TEntity,
  handlers: ObserveHandlers<TEntity>,
): Unsubscribe {
  let isInitial = true;

  return onSnapshot(
    query,
    (snapshot) => {
      const changes: CollectionChange<TEntity>[] = [];

      for (const change of snapshot.docChanges()) {
        if (change.type === 'removed') {
          changes.push({ type: 'removed', id: change.doc.id });
          continue;
        }

        try {
          changes.push({
            type: 'upserted',
            entity: mapDocument(change.doc.id, change.doc.data()),
          });
        } catch (error) {
          console.error(
            `[sync] Document ignoré (${change.doc.ref.path}) : il ne correspond pas au modèle.`,
            error,
          );
        }
      }

      handlers.onSnapshot({
        changes,
        fromCache: snapshot.metadata.fromCache,
        isInitial,
      });

      isInitial = false;
    },
    (error) => {
      handlers.onError(mapFirebaseError(error));
    },
  );
}
