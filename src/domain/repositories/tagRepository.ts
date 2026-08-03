import type { TagId, UserId } from '../models/ids';
import type { Tag } from '../models/tag';
import type { ObserveHandlers, Unsubscribe } from './types';

export interface TagRepository {
  observeAll(userId: UserId, handlers: ObserveHandlers<Tag>): Unsubscribe;
  create(userId: UserId, tag: Tag): Promise<void>;
  update(userId: UserId, tag: Tag): Promise<void>;
  /** Tags are hard-deleted: unlike a memory, a tag carries no content to lose,
   * and the cascade that detaches it from memories is the reversible part. */
  delete(userId: UserId, tagId: TagId): Promise<void>;
  /** Several tags at once, for the "create tags inline while capturing" flow. */
  createMany(userId: UserId, tags: readonly Tag[]): Promise<void>;
}
