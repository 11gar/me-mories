import { create } from 'zustand';

import type { DateTagId, Memory, MemoryDraft, MemoryId, MemoryPatch, TagId } from '@/domain/models';
import {
  applyPatch,
  byNewestFirst,
  createMemory as buildMemory,
  isActive,
  isDeleted,
  withDateTag,
  withTag,
  withoutDateTag,
  withoutTag,
} from '@/domain/models';
import type { CollectionChange } from '@/domain/repositories';
import { memoryRepository } from '@/infrastructure/firebase';
import { memorySearchIndex } from '@/search/searchIndex';

import { requireUserId } from './sessionStore';

interface MemoriesState {
  byId: Record<string, Memory>;
  /**
   * Derived lists, recomputed whenever a snapshot lands.
   *
   * Kept in the store rather than memoised in selectors so their identity is
   * stable by construction: a selector that rebuilds an array on every call
   * would re-render every subscriber on every unrelated state change.
   */
  all: Memory[];
  active: Memory[];
  trashed: Memory[];
  loaded: boolean;

  applyChanges: (changes: CollectionChange<Memory>[]) => void;
  reset: () => void;
}

function derive(byId: Record<string, Memory>) {
  const all = Object.values(byId).sort(byNewestFirst);

  return {
    byId,
    all,
    active: all.filter(isActive),
    trashed: all.filter(isDeleted),
  };
}

export const useMemoriesStore = create<MemoriesState>()((set) => ({
  byId: {},
  all: [],
  active: [],
  trashed: [],
  loaded: false,

  applyChanges: (changes) =>
    set((state) => {
      if (changes.length === 0) return { loaded: true };

      // The search index is part of the read model, so it is updated from the
      // same deltas and in the same place — there is no window in which the
      // list and the index disagree.
      memorySearchIndex.apply(changes);

      const byId = { ...state.byId };

      for (const change of changes) {
        if (change.type === 'removed') {
          delete byId[change.id];
        } else {
          byId[change.entity.id] = change.entity;
        }
      }

      return { ...derive(byId), loaded: true };
    }),

  reset: () => {
    memorySearchIndex.clear();
    set({ byId: {}, all: [], active: [], trashed: [], loaded: false });
  },
}));

export const selectMemoryById = (memoryId: MemoryId | undefined) => (state: MemoriesState) =>
  memoryId === undefined ? undefined : state.byId[memoryId];

// ---------------------------------------------------------------------------
// Actions
//
// Every write goes to Firestore and comes back through the snapshot listener.
// There is no hand-written optimistic update: Firestore's latency compensation
// applies the write to its local cache immediately and emits a snapshot with
// `hasPendingWrites`, so the store is already up to date before the network
// answers — and offline writes replay on their own.
// ---------------------------------------------------------------------------

export async function createMemory(draft: MemoryDraft, now = new Date()): Promise<Memory> {
  const memory = buildMemory(draft, now);
  await memoryRepository.create(requireUserId(), memory);
  return memory;
}

export async function updateMemory(
  memoryId: MemoryId,
  patch: MemoryPatch,
  now = new Date(),
): Promise<void> {
  const memory = useMemoriesStore.getState().byId[memoryId];
  if (memory === undefined) return;

  await memoryRepository.update(requireUserId(), applyPatch(memory, patch, now));
}

export async function softDeleteMemory(memoryId: MemoryId, now = new Date()): Promise<void> {
  await memoryRepository.softDelete(requireUserId(), memoryId, now);
}

export async function restoreMemory(memoryId: MemoryId, now = new Date()): Promise<void> {
  await memoryRepository.restore(requireUserId(), memoryId, now);
}

export async function hardDeleteMemory(memoryId: MemoryId): Promise<void> {
  await memoryRepository.hardDelete(requireUserId(), memoryId);
}

export async function emptyTrash(): Promise<void> {
  const userId = requireUserId();
  const { trashed } = useMemoriesStore.getState();

  await Promise.all(trashed.map((memory) => memoryRepository.hardDelete(userId, memory.id)));
}

export async function markMemoryReviewed(memoryId: MemoryId, now = new Date()): Promise<void> {
  await memoryRepository.markReviewed(requireUserId(), memoryId, now);
}

export async function toggleMemoryTag(
  memoryId: MemoryId,
  tagId: TagId,
  now = new Date(),
): Promise<void> {
  const memory = useMemoriesStore.getState().byId[memoryId];
  if (memory === undefined) return;

  const next = memory.tagIds.includes(tagId)
    ? withoutTag(memory, tagId, now)
    : withTag(memory, tagId, now);

  await memoryRepository.update(requireUserId(), next);
}

export async function toggleMemoryDateTag(
  memoryId: MemoryId,
  dateTagId: DateTagId,
  now = new Date(),
): Promise<void> {
  const memory = useMemoriesStore.getState().byId[memoryId];
  if (memory === undefined) return;

  const next = memory.dateTagIds.includes(dateTagId)
    ? withoutDateTag(memory, dateTagId, now)
    : withDateTag(memory, dateTagId, now);

  await memoryRepository.update(requireUserId(), next);
}

/** Memories carrying a given tag — the input to the delete and merge cascades. */
export function memoryIdsWithTag(tagId: TagId): MemoryId[] {
  return useMemoriesStore
    .getState()
    .all.filter((memory) => memory.tagIds.includes(tagId))
    .map((memory) => memory.id);
}

export function memoryIdsWithDateTag(dateTagId: DateTagId): MemoryId[] {
  return useMemoriesStore
    .getState()
    .all.filter((memory) => memory.dateTagIds.includes(dateTagId))
    .map((memory) => memory.id);
}
