import { z } from 'zod';

import { createId } from '@/lib/id';

import { asMemoryId, dateTagIdSchema, memoryIdSchema, tagIdSchema } from './ids';
import type { DateTagId, TagId } from './ids';

export const MEMORY_SCHEMA_VERSION = 1;
export const MEMORY_TEXT_MAX_LENGTH = 10_000;
export const MEMORY_MAX_RELATIONS = 50;

/**
 * The core entity: one thing the user wanted to remember.
 *
 * Timestamps are `Date`, never Firestore `Timestamp` — the domain must not know
 * what stores it. The converters in `infrastructure/firebase` do the mapping.
 *
 * Fields beyond the four essentials earn their place:
 *  - `deletedAt` makes deletion reversible. Swipe mode offers to delete, and on
 *    a personal knowledge base that gesture has to be undoable.
 *  - `lastReviewedAt` / `reviewCount` feed the weighted draw, so a memory never
 *    seen surfaces before one reviewed yesterday. Uniform random repeats itself
 *    and leaves blind spots.
 *  - `schemaVersion` is the escape hatch for the day an additive field is not
 *    enough.
 */
export const memorySchema = z.object({
  id: memoryIdSchema,
  text: z.string().min(1).max(MEMORY_TEXT_MAX_LENGTH),
  createdAt: z.date(),
  updatedAt: z.date(),
  tagIds: z.array(tagIdSchema).max(MEMORY_MAX_RELATIONS),
  dateTagIds: z.array(dateTagIdSchema).max(MEMORY_MAX_RELATIONS),
  deletedAt: z.date().nullable().default(null),
  lastReviewedAt: z.date().nullable().default(null),
  reviewCount: z.number().int().min(0).default(0),
  schemaVersion: z.number().int().min(1).default(MEMORY_SCHEMA_VERSION),
});

export type Memory = z.infer<typeof memorySchema>;

/** What the capture form produces — everything else is derived. */
export interface MemoryDraft {
  text: string;
  tagIds: TagId[];
  dateTagIds: DateTagId[];
}

/** A partial edit. Absent keys are left untouched. */
export interface MemoryPatch {
  text?: string;
  tagIds?: TagId[];
  dateTagIds?: DateTagId[];
}

export const memoryDraftSchema = z.object({
  text: z.string().trim().min(1, 'Le texte ne peut pas être vide.').max(MEMORY_TEXT_MAX_LENGTH),
  tagIds: z.array(tagIdSchema).max(MEMORY_MAX_RELATIONS).default([]),
  dateTagIds: z.array(dateTagIdSchema).max(MEMORY_MAX_RELATIONS).default([]),
});

export function createMemory(draft: MemoryDraft, now: Date = new Date()): Memory {
  return {
    id: asMemoryId(createId()),
    text: draft.text.trim(),
    createdAt: now,
    updatedAt: now,
    tagIds: [...draft.tagIds],
    dateTagIds: [...draft.dateTagIds],
    deletedAt: null,
    lastReviewedAt: null,
    reviewCount: 0,
    schemaVersion: MEMORY_SCHEMA_VERSION,
  };
}

export function applyPatch(memory: Memory, patch: MemoryPatch, now: Date = new Date()): Memory {
  return {
    ...memory,
    ...(patch.text === undefined ? {} : { text: patch.text.trim() }),
    ...(patch.tagIds === undefined ? {} : { tagIds: [...patch.tagIds] }),
    ...(patch.dateTagIds === undefined ? {} : { dateTagIds: [...patch.dateTagIds] }),
    updatedAt: now,
  };
}

export const isDeleted = (memory: Memory): boolean => memory.deletedAt !== null;
export const isActive = (memory: Memory): boolean => memory.deletedAt === null;

export const hasTag = (memory: Memory, tagId: TagId): boolean => memory.tagIds.includes(tagId);
export const hasDateTag = (memory: Memory, dateTagId: DateTagId): boolean =>
  memory.dateTagIds.includes(dateTagId);

/** True when the memory carries no tag and no date tag — the pile swipe mode
 * exists to work through. */
export const isUntagged = (memory: Memory): boolean =>
  memory.tagIds.length === 0 && memory.dateTagIds.length === 0;

export function withTag(memory: Memory, tagId: TagId, now: Date = new Date()): Memory {
  if (hasTag(memory, tagId)) return memory;
  return { ...memory, tagIds: [...memory.tagIds, tagId], updatedAt: now };
}

export function withoutTag(memory: Memory, tagId: TagId, now: Date = new Date()): Memory {
  if (!hasTag(memory, tagId)) return memory;
  return { ...memory, tagIds: memory.tagIds.filter((id) => id !== tagId), updatedAt: now };
}

export function withDateTag(memory: Memory, dateTagId: DateTagId, now: Date = new Date()): Memory {
  if (hasDateTag(memory, dateTagId)) return memory;
  return { ...memory, dateTagIds: [...memory.dateTagIds, dateTagId], updatedAt: now };
}

export function withoutDateTag(
  memory: Memory,
  dateTagId: DateTagId,
  now: Date = new Date(),
): Memory {
  if (!hasDateTag(memory, dateTagId)) return memory;
  return {
    ...memory,
    dateTagIds: memory.dateTagIds.filter((id) => id !== dateTagId),
    updatedAt: now,
  };
}

export const byNewestFirst = (a: Memory, b: Memory): number =>
  b.createdAt.getTime() - a.createdAt.getTime();

export const byOldestFirst = (a: Memory, b: Memory): number =>
  a.createdAt.getTime() - b.createdAt.getTime();

export const byRecentlyUpdated = (a: Memory, b: Memory): number =>
  b.updatedAt.getTime() - a.updatedAt.getTime();
