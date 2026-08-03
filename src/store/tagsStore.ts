import { create } from 'zustand';

import type { Tag, TagDraft, TagId } from '@/domain/models';
import {
  byTitle,
  createTag as buildTag,
  findTagByTitle,
  recolorTag,
  renameTag,
} from '@/domain/models';
import { suggestTagColor } from '@/domain/services/colors';
import type { CollectionChange } from '@/domain/repositories';
import { memoryRepository, tagRepository } from '@/infrastructure/firebase';

import { memoryIdsWithTag } from './memoriesStore';
import { requireUserId } from './sessionStore';

interface TagsState {
  byId: Record<string, Tag>;
  /** Alphabetical, accent-insensitive. */
  all: Tag[];
  loaded: boolean;

  applyChanges: (changes: CollectionChange<Tag>[]) => void;
  reset: () => void;
}

export const useTagsStore = create<TagsState>()((set) => ({
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

      return { byId, all: Object.values(byId).sort(byTitle), loaded: true };
    }),

  reset: () => set({ byId: {}, all: [], loaded: false }),
}));

// ---------------------------------------------------------------------- reads

export const getTag = (tagId: TagId): Tag | undefined => useTagsStore.getState().byId[tagId];

/** Resolves ids to tags, silently dropping unknown ones.
 *
 * Defence in depth against dangling references: the delete cascade should have
 * cleaned them up, but a half-applied batch or a stale device must degrade to a
 * missing chip, never to a crash. */
export function resolveTags(tagIds: readonly TagId[], byId: Record<string, Tag>): Tag[] {
  return tagIds.map((id) => byId[id]).filter((tag): tag is Tag => tag !== undefined);
}

// -------------------------------------------------------------------- actions

export async function createTag(draft: TagDraft, now = new Date()): Promise<Tag> {
  const tag = buildTag(draft, now);
  await tagRepository.create(requireUserId(), tag);
  return tag;
}

/**
 * Returns the tag matching this title, creating it if it does not exist.
 *
 * The de-duplication is the point: inline `#hashtags` during capture would
 * otherwise mint "Café", "café" and "CAFE" as three separate tags within a week.
 */
export async function findOrCreateTag(title: string, now = new Date()): Promise<Tag> {
  const { all } = useTagsStore.getState();
  const existing = findTagByTitle(all, title);
  if (existing !== undefined) return existing;

  const color = suggestTagColor(all.map((tag) => tag.color));
  return createTag({ title, color }, now);
}

/** Resolves several titles at once, creating the missing ones in one batch. */
export async function findOrCreateTags(
  titles: readonly string[],
  now = new Date(),
): Promise<Tag[]> {
  const { all } = useTagsStore.getState();
  const resolved: Tag[] = [];
  const created: Tag[] = [];
  // Track colours as we go so tags created in the same breath do not collide.
  const usedColors = all.map((tag) => tag.color);

  for (const title of titles) {
    const existing = findTagByTitle([...all, ...created], title);

    if (existing === undefined) {
      const tag = buildTag({ title, color: suggestTagColor(usedColors) }, now);
      usedColors.push(tag.color);
      created.push(tag);
      resolved.push(tag);
    } else {
      resolved.push(existing);
    }
  }

  if (created.length > 0) {
    await tagRepository.createMany(requireUserId(), created);
  }

  return resolved;
}

export async function updateTag(
  tagId: TagId,
  changes: { title?: string; color?: string },
  now = new Date(),
): Promise<void> {
  const tag = useTagsStore.getState().byId[tagId];
  if (tag === undefined) return;

  let next = tag;
  if (changes.title !== undefined) next = renameTag(next, changes.title, now);
  if (changes.color !== undefined) next = recolorTag(next, changes.color, now);

  await tagRepository.update(requireUserId(), next);
}

/**
 * Deletes a tag and detaches it from every memory carrying it.
 *
 * Firestore has no referential integrity, so the cascade is ours to run. It goes
 * first: a tag document that outlives a failed detach is a harmless orphan,
 * while memories pointing at a deleted tag would render blank chips.
 */
export async function deleteTag(tagId: TagId, now = new Date()): Promise<void> {
  const userId = requireUserId();
  const affected = memoryIdsWithTag(tagId);

  await memoryRepository.detachTag(userId, tagId, affected, now);
  await tagRepository.delete(userId, tagId);
}

/** Moves every memory from `sourceTagId` to `targetTagId`, then drops the source. */
export async function mergeTags(
  sourceTagId: TagId,
  targetTagId: TagId,
  now = new Date(),
): Promise<void> {
  if (sourceTagId === targetTagId) return;

  const userId = requireUserId();
  const affected = memoryIdsWithTag(sourceTagId);

  await memoryRepository.replaceTag(userId, sourceTagId, targetTagId, affected, now);
  await tagRepository.delete(userId, sourceTagId);
}
