import { create } from 'zustand';

import type { DateTag, DateTagDraft, DateTagId, IsoDate } from '@/domain/models';
import {
  byDateDescending,
  createDateTag as buildDateTag,
  findDateTagByDate,
  updateDateTag as applyDateTagChanges,
} from '@/domain/models';
import type { CollectionChange } from '@/domain/repositories';
import { dateTagRepository, memoryRepository } from '@/infrastructure/firebase';

import { memoryIdsWithDateTag } from './memoriesStore';
import { requireUserId } from './sessionStore';

interface DateTagsState {
  byId: Record<string, DateTag>;
  /** Most recent date first. */
  all: DateTag[];
  loaded: boolean;

  applyChanges: (changes: CollectionChange<DateTag>[]) => void;
  reset: () => void;
}

export const useDateTagsStore = create<DateTagsState>()((set) => ({
  byId: {},
  all: [],
  loaded: false,

  applyChanges: (changes) =>
    set((state) => {
      if (changes.length === 0) return { loaded: true };

      const byId = { ...state.byId };

      for (const change of changes) {
        if (change.type === 'removed') {
          delete byId[change.id];
        } else {
          byId[change.entity.id] = change.entity;
        }
      }

      return { byId, all: Object.values(byId).sort(byDateDescending), loaded: true };
    }),

  reset: () => set({ byId: {}, all: [], loaded: false }),
}));

export function resolveDateTags(
  dateTagIds: readonly DateTagId[],
  byId: Record<string, DateTag>,
): DateTag[] {
  return dateTagIds
    .map((id) => byId[id])
    .filter((dateTag): dateTag is DateTag => dateTag !== undefined);
}

// -------------------------------------------------------------------- actions

export async function createDateTag(draft: DateTagDraft, now = new Date()): Promise<DateTag> {
  const dateTag = buildDateTag(draft, now);
  await dateTagRepository.create(requireUserId(), dateTag);
  return dateTag;
}

/**
 * One DateTag per calendar day. Reusing the existing one keeps "12 mars 2024"
 * a single filterable entity rather than a dozen duplicates created by inline
 * `@dates` over the years.
 */
export async function findOrCreateDateTag(date: IsoDate, now = new Date()): Promise<DateTag> {
  const existing = findDateTagByDate(useDateTagsStore.getState().all, date);
  if (existing !== undefined) return existing;

  return createDateTag({ date, label: null }, now);
}

export async function findOrCreateDateTags(
  dates: readonly IsoDate[],
  now = new Date(),
): Promise<DateTag[]> {
  const { all } = useDateTagsStore.getState();
  const resolved: DateTag[] = [];
  const created: DateTag[] = [];

  for (const date of dates) {
    const existing = findDateTagByDate([...all, ...created], date);

    if (existing === undefined) {
      const dateTag = buildDateTag({ date, label: null }, now);
      created.push(dateTag);
      resolved.push(dateTag);
    } else {
      resolved.push(existing);
    }
  }

  if (created.length > 0) {
    await dateTagRepository.createMany(requireUserId(), created);
  }

  return resolved;
}

export async function updateDateTag(
  dateTagId: DateTagId,
  changes: Partial<DateTagDraft>,
  now = new Date(),
): Promise<void> {
  const dateTag = useDateTagsStore.getState().byId[dateTagId];
  if (dateTag === undefined) return;

  await dateTagRepository.update(requireUserId(), applyDateTagChanges(dateTag, changes, now));
}

/** Same cascade rule as tags: detach from memories first, then delete. */
export async function deleteDateTag(dateTagId: DateTagId, now = new Date()): Promise<void> {
  const userId = requireUserId();
  const affected = memoryIdsWithDateTag(dateTagId);

  await memoryRepository.detachDateTag(userId, dateTagId, affected, now);
  await dateTagRepository.delete(userId, dateTagId);
}
