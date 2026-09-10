import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  deleteDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

import type { TodoRepository } from '@/domain/repositories';

import { runBatched } from '../batch';
import { todoFromDocument, todoToDocument } from '../converters';
import { withMappedError } from '../errorMapping';
import { observeCollection } from '../observeCollection';
import { todoDoc, todosCollection } from '../paths';

export function createFirestoreTodoRepository(db: Firestore): TodoRepository {
  return {
    observeAll(userId, handlers) {
      // Unfiltered, like memories: every section, grouping and count the Todo
      // page computes runs locally, so there is no composite index to maintain
      // and no round trip when the day rolls over.
      return observeCollection(todosCollection(db, userId), todoFromDocument, handlers);
    },

    async create(userId, todo) {
      await withMappedError(() => setDoc(todoDoc(db, userId, todo.id), todoToDocument(todo)));
    },

    async update(userId, todo) {
      await withMappedError(() => setDoc(todoDoc(db, userId, todo.id), todoToDocument(todo)));
    },

    async saveWriteSet(userId, updated, created) {
      // One batch for the whole gesture. Completing a series is "advance the
      // series" plus "record the day that was due", and half of that is worse
      // than neither: an advance alone loses the occurrence, a record alone
      // leaves the series due on a day already ticked off.
      await runBatched(db, [updated, ...created], (batch, todo) => {
        batch.set(todoDoc(db, userId, todo.id), todoToDocument(todo));
      });
    },

    async softDelete(userId, todoId, now) {
      await withMappedError(() =>
        updateDoc(todoDoc(db, userId, todoId), {
          deletedAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        }),
      );
    },

    async restore(userId, todoId, now) {
      await withMappedError(() =>
        updateDoc(todoDoc(db, userId, todoId), {
          deletedAt: null,
          updatedAt: Timestamp.fromDate(now),
        }),
      );
    },

    async hardDelete(userId, todoId) {
      await withMappedError(() => deleteDoc(todoDoc(db, userId, todoId)));
    },

    async detachTag(userId, tagId, todoIds, now) {
      await runBatched(db, todoIds, (batch, todoId) => {
        batch.update(todoDoc(db, userId, todoId), {
          tagIds: arrayRemove(tagId),
          updatedAt: Timestamp.fromDate(now),
        });
      });
    },

    async replaceTag(userId, sourceTagId, targetTagId, todoIds, now) {
      // Two passes, for the same reason as memories: Firestore refuses two
      // array transforms on one field in a single write. Adding first means an
      // interruption leaves todos carrying both tags — visible and fixable —
      // rather than neither.
      await runBatched(db, todoIds, (batch, todoId) => {
        batch.update(todoDoc(db, userId, todoId), {
          tagIds: arrayUnion(targetTagId),
          updatedAt: Timestamp.fromDate(now),
        });
      });

      await runBatched(db, todoIds, (batch, todoId) => {
        batch.update(todoDoc(db, userId, todoId), {
          tagIds: arrayRemove(sourceTagId),
          updatedAt: Timestamp.fromDate(now),
        });
      });
    },
  };
}
