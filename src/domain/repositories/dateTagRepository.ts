import type { DateTag } from '../models/dateTag';
import type { DateTagId, UserId } from '../models/ids';
import type { ObserveHandlers, Unsubscribe } from './types';

export interface DateTagRepository {
  observeAll(userId: UserId, handlers: ObserveHandlers<DateTag>): Unsubscribe;
  create(userId: UserId, dateTag: DateTag): Promise<void>;
  update(userId: UserId, dateTag: DateTag): Promise<void>;
  delete(userId: UserId, dateTagId: DateTagId): Promise<void>;
  createMany(userId: UserId, dateTags: readonly DateTag[]): Promise<void>;
}
