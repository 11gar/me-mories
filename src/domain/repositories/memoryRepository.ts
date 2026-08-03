import type { MemoryId, TagId, UserId } from '../models/ids';
import type { DateTagId } from '../models/ids';
import type { Memory } from '../models/memory';
import type { ObserveHandlers, Unsubscribe } from './types';

/**
 * The port through which memories are persisted.
 *
 * Cascade operations take the ids of the affected memories rather than
 * discovering them: the caller (the store) already holds every memory in
 * memory, so making the repository re-query would be pure waste. It also keeps
 * this interface implementable by any backend, including an in-memory fake.
 */
export interface MemoryRepository {
  /** Streams the user's whole collection, including trashed memories — the
   * trash view needs them, and there is no second query to pay for. */
  observeAll(userId: UserId, handlers: ObserveHandlers<Memory>): Unsubscribe;

  create(userId: UserId, memory: Memory): Promise<void>;
  update(userId: UserId, memory: Memory): Promise<void>;

  softDelete(userId: UserId, memoryId: MemoryId, now: Date): Promise<void>;
  restore(userId: UserId, memoryId: MemoryId, now: Date): Promise<void>;
  /** Irreversible. Only ever called when emptying the trash. */
  hardDelete(userId: UserId, memoryId: MemoryId): Promise<void>;

  /** Bumps `lastReviewedAt`/`reviewCount`, which drive the weighted draw. */
  markReviewed(userId: UserId, memoryId: MemoryId, now: Date): Promise<void>;

  /** Cascade for tag deletion: Firestore has no referential integrity. */
  detachTag(userId: UserId, tagId: TagId, memoryIds: readonly MemoryId[], now: Date): Promise<void>;
  detachDateTag(
    userId: UserId,
    dateTagId: DateTagId,
    memoryIds: readonly MemoryId[],
    now: Date,
  ): Promise<void>;

  /** Cascade for tag merging: every `sourceTagId` becomes `targetTagId`. */
  replaceTag(
    userId: UserId,
    sourceTagId: TagId,
    targetTagId: TagId,
    memoryIds: readonly MemoryId[],
    now: Date,
  ): Promise<void>;
}
