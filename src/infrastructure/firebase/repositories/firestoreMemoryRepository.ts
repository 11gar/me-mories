import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  deleteDoc,
  increment,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

import type { MemoryRepository } from '@/domain/repositories';

import { runBatched } from '../batch';
import { memoryFromDocument, memoryToDocument } from '../converters';
import { withMappedError } from '../errorMapping';
import { observeCollection } from '../observeCollection';
import { memoriesCollection, memoryDoc } from '../paths';

export function createFirestoreMemoryRepository(db: Firestore): MemoryRepository {
  return {
    observeAll(userId, handlers) {
      // Unfiltered on purpose: trashed memories are needed by the trash view,
      // and an unfiltered collection listener needs no composite index. Every
      // filter the app offers is applied client-side.
      return observeCollection(memoriesCollection(db, userId), memoryFromDocument, handlers);
    },

    async create(userId, memory) {
      await withMappedError(() =>
        setDoc(memoryDoc(db, userId, memory.id), memoryToDocument(memory)),
      );
    },

    async update(userId, memory) {
      await withMappedError(() =>
        setDoc(memoryDoc(db, userId, memory.id), memoryToDocument(memory)),
      );
    },

    async softDelete(userId, memoryId, now) {
      await withMappedError(() =>
        updateDoc(memoryDoc(db, userId, memoryId), {
          deletedAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        }),
      );
    },

    async restore(userId, memoryId, now) {
      await withMappedError(() =>
        updateDoc(memoryDoc(db, userId, memoryId), {
          deletedAt: null,
          updatedAt: Timestamp.fromDate(now),
        }),
      );
    },

    async hardDelete(userId, memoryId) {
      await withMappedError(() => deleteDoc(memoryDoc(db, userId, memoryId)));
    },

    async markReviewed(userId, memoryId, now) {
      // `increment` rather than read-modify-write: reviewing from two devices
      // must not lose a count.
      //
      // Note that `updatedAt` is left alone — reviewing is not editing, and
      // bumping it would scramble the "recently modified" ordering.
      await withMappedError(() =>
        updateDoc(memoryDoc(db, userId, memoryId), {
          lastReviewedAt: Timestamp.fromDate(now),
          reviewCount: increment(1),
        }),
      );
    },

    async detachTag(userId, tagId, memoryIds, now) {
      await runBatched(db, memoryIds, (batch, memoryId) => {
        batch.update(memoryDoc(db, userId, memoryId), {
          tagIds: arrayRemove(tagId),
          updatedAt: Timestamp.fromDate(now),
        });
      });
    },

    async detachDateTag(userId, dateTagId, memoryIds, now) {
      await runBatched(db, memoryIds, (batch, memoryId) => {
        batch.update(memoryDoc(db, userId, memoryId), {
          dateTagIds: arrayRemove(dateTagId),
          updatedAt: Timestamp.fromDate(now),
        });
      });
    },

    async replaceTag(userId, sourceTagId, targetTagId, memoryIds, now) {
      // Firestore refuses two array transforms on the same field in one write,
      // so the merge runs in two passes. Adding first means an interruption
      // between them leaves memories carrying both tags — visible and fixable —
      // rather than neither, which would lose the classification.
      await runBatched(db, memoryIds, (batch, memoryId) => {
        batch.update(memoryDoc(db, userId, memoryId), {
          tagIds: arrayUnion(targetTagId),
          updatedAt: Timestamp.fromDate(now),
        });
      });

      await runBatched(db, memoryIds, (batch, memoryId) => {
        batch.update(memoryDoc(db, userId, memoryId), {
          tagIds: arrayRemove(sourceTagId),
          updatedAt: Timestamp.fromDate(now),
        });
      });
    },
  };
}
