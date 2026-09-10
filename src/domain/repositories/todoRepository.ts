import type { TagId, TodoId, UserId } from '../models/ids';
import type { Todo } from '../models/todo';
import type { ObserveHandlers, Unsubscribe } from './types';

/**
 * The port through which todos are persisted.
 *
 * Deliberately the same shape as `MemoryRepository`, cascades included: tags
 * are shared between the two entities, so deleting or merging one has to reach
 * both collections. Firestore has no referential integrity to do it for us.
 */
export interface TodoRepository {
  /** Streams the whole collection, deleted todos included — same reasoning as
   * for memories: the trash needs them and there is no second query to pay. */
  observeAll(userId: UserId, handlers: ObserveHandlers<Todo>): Unsubscribe;

  create(userId: UserId, todo: Todo): Promise<void>;
  update(userId: UserId, todo: Todo): Promise<void>;

  /**
   * Writes a todo and the occurrences it spawned in one batch.
   *
   * Completing or postponing a series is two or three documents that only make
   * sense together: a series advanced with no record of the day it left behind
   * is a lost occurrence, and a record with no advance is a duplicate. One
   * batch makes the pair atomic.
   */
  saveWriteSet(userId: UserId, updated: Todo, created: readonly Todo[]): Promise<void>;

  softDelete(userId: UserId, todoId: TodoId, now: Date): Promise<void>;
  restore(userId: UserId, todoId: TodoId, now: Date): Promise<void>;
  /** Irreversible. Only ever called when emptying the trash. */
  hardDelete(userId: UserId, todoId: TodoId): Promise<void>;

  /** Cascade for tag deletion. */
  detachTag(userId: UserId, tagId: TagId, todoIds: readonly TodoId[], now: Date): Promise<void>;

  /** Cascade for tag merging: every `sourceTagId` becomes `targetTagId`. */
  replaceTag(
    userId: UserId,
    sourceTagId: TagId,
    targetTagId: TagId,
    todoIds: readonly TodoId[],
    now: Date,
  ): Promise<void>;
}
