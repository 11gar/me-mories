import { Timestamp } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { z } from 'zod';

import { AppError } from '@/domain/errors';
import {
  DATE_TAG_LABEL_MAX_LENGTH,
  MEMORY_MAX_RELATIONS,
  MEMORY_SCHEMA_VERSION,
  MEMORY_TEXT_MAX_LENGTH,
  TAG_TITLE_MAX_LENGTH,
  TODO_MAX_TAGS,
  TODO_SCHEMA_VERSION,
  TODO_TITLE_MAX_LENGTH,
  asDateTagId,
  asMemoryId,
  asTagId,
  asTodoId,
  asUserId,
  defaultUserSettings,
  hexColorSchema,
  isoDateSchema,
  recurrenceRuleSchema,
  todoStatusSchema,
  userSettingsSchema,
} from '@/domain/models';
import type { DateTag, Memory, Tag, Todo, UserProfile } from '@/domain/models';

/**
 * The boundary between Firestore documents and domain entities.
 *
 * Two jobs:
 *
 *  1. **Translate.** The domain speaks `Date`; Firestore speaks `Timestamp`.
 *     Neither should know about the other.
 *  2. **Validate.** Firestore is schemaless. A document written by an older
 *     build, a botched migration, or a manual edit in the console will parse as
 *     `any` and blow up three components deep. Everything is checked here, once.
 *
 * Firestore's own `FirestoreDataConverter` is deliberately not used: its
 * `WithFieldValue<T>` generics fight branded types for no benefit, and explicit
 * functions read better at the call site.
 */

const timestampSchema = z
  .custom<Timestamp>((value) => value instanceof Timestamp, {
    message: 'Timestamp Firestore attendu.',
  })
  .transform((value) => value.toDate());

const nullableTimestampSchema = timestampSchema.nullable().default(null);

// --------------------------------------------------------------------- Memory

const memoryDocumentSchema = z.object({
  text: z.string().min(1).max(MEMORY_TEXT_MAX_LENGTH),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  tagIds: z.array(z.string().min(1)).max(MEMORY_MAX_RELATIONS).default([]),
  dateTagIds: z.array(z.string().min(1)).max(MEMORY_MAX_RELATIONS).default([]),
  deletedAt: nullableTimestampSchema,
  lastReviewedAt: nullableTimestampSchema,
  reviewCount: z.number().int().min(0).default(0),
  schemaVersion: z.number().int().min(1).default(MEMORY_SCHEMA_VERSION),
});

export function memoryFromDocument(id: string, data: DocumentData): Memory {
  const parsed = parseDocument(memoryDocumentSchema, data, 'memory', id);

  return {
    id: asMemoryId(id),
    text: parsed.text,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    tagIds: parsed.tagIds.map(asTagId),
    dateTagIds: parsed.dateTagIds.map(asDateTagId),
    deletedAt: parsed.deletedAt,
    lastReviewedAt: parsed.lastReviewedAt,
    reviewCount: parsed.reviewCount,
    schemaVersion: parsed.schemaVersion,
  };
}

/**
 * Timestamps are written from the client clock rather than `serverTimestamp()`.
 *
 * It is the more honest semantic here: `createdAt` should mean "when I wrote
 * this", not "when the network came back". It also keeps optimistic rendering
 * exact — a server sentinel resolves to null in the local snapshot until the
 * write is acknowledged, which would break ordering and validation on the way
 * in.
 */
export function memoryToDocument(memory: Memory): DocumentData {
  return {
    text: memory.text,
    createdAt: Timestamp.fromDate(memory.createdAt),
    updatedAt: Timestamp.fromDate(memory.updatedAt),
    tagIds: [...memory.tagIds],
    dateTagIds: [...memory.dateTagIds],
    deletedAt: memory.deletedAt === null ? null : Timestamp.fromDate(memory.deletedAt),
    lastReviewedAt:
      memory.lastReviewedAt === null ? null : Timestamp.fromDate(memory.lastReviewedAt),
    reviewCount: memory.reviewCount,
    schemaVersion: memory.schemaVersion,
  };
}

// ------------------------------------------------------------------------ Tag

const tagDocumentSchema = z.object({
  title: z.string().min(1).max(TAG_TITLE_MAX_LENGTH),
  titleNormalized: z.string().min(1).max(TAG_TITLE_MAX_LENGTH),
  color: hexColorSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export function tagFromDocument(id: string, data: DocumentData): Tag {
  const parsed = parseDocument(tagDocumentSchema, data, 'tag', id);
  return { id: asTagId(id), ...parsed };
}

export function tagToDocument(tag: Tag): DocumentData {
  return {
    title: tag.title,
    titleNormalized: tag.titleNormalized,
    color: tag.color,
    createdAt: Timestamp.fromDate(tag.createdAt),
    updatedAt: Timestamp.fromDate(tag.updatedAt),
  };
}

// -------------------------------------------------------------------- DateTag

const dateTagDocumentSchema = z.object({
  date: isoDateSchema,
  label: z.string().min(1).max(DATE_TAG_LABEL_MAX_LENGTH).nullable().default(null),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export function dateTagFromDocument(id: string, data: DocumentData): DateTag {
  const parsed = parseDocument(dateTagDocumentSchema, data, 'dateTag', id);
  return { id: asDateTagId(id), ...parsed };
}

export function dateTagToDocument(dateTag: DateTag): DocumentData {
  return {
    date: dateTag.date,
    label: dateTag.label,
    createdAt: Timestamp.fromDate(dateTag.createdAt),
    updatedAt: Timestamp.fromDate(dateTag.updatedAt),
  };
}

// ----------------------------------------------------------------------- Todo

const todoDocumentSchema = z.object({
  title: z.string().min(1).max(TODO_TITLE_MAX_LENGTH),
  dueDate: isoDateSchema.nullable().default(null),
  recurrence: recurrenceRuleSchema.nullable().default(null),
  status: todoStatusSchema.default('todo'),
  tagIds: z.array(z.string().min(1)).max(TODO_MAX_TAGS).default([]),
  seriesId: z.string().min(1).nullable().default(null),
  postponeCount: z.number().int().min(0).default(0),
  completedAt: nullableTimestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  deletedAt: nullableTimestampSchema,
  schemaVersion: z.number().int().min(1).default(TODO_SCHEMA_VERSION),
});

export function todoFromDocument(id: string, data: DocumentData): Todo {
  const parsed = parseDocument(todoDocumentSchema, data, 'todo', id);

  return {
    id: asTodoId(id),
    title: parsed.title,
    dueDate: parsed.dueDate,
    recurrence: parsed.recurrence,
    status: parsed.status,
    tagIds: parsed.tagIds.map(asTagId),
    seriesId: parsed.seriesId === null ? null : asTodoId(parsed.seriesId),
    postponeCount: parsed.postponeCount,
    completedAt: parsed.completedAt,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    deletedAt: parsed.deletedAt,
    schemaVersion: parsed.schemaVersion,
  };
}

export function todoToDocument(todo: Todo): DocumentData {
  return {
    title: todo.title,
    // A civil day, stored as the same `YYYY-MM-DD` string as `DateTag.date` —
    // a deadline read in another timezone must not slide by a day.
    dueDate: todo.dueDate,
    // A plain nested map rather than a serialised rule string: it stays legible
    // in the Firestore console and can be validated field by field by the rules.
    recurrence: todo.recurrence === null ? null : { ...todo.recurrence },
    status: todo.status,
    tagIds: [...todo.tagIds],
    seriesId: todo.seriesId,
    postponeCount: todo.postponeCount,
    completedAt: todo.completedAt === null ? null : Timestamp.fromDate(todo.completedAt),
    createdAt: Timestamp.fromDate(todo.createdAt),
    updatedAt: Timestamp.fromDate(todo.updatedAt),
    deletedAt: todo.deletedAt === null ? null : Timestamp.fromDate(todo.deletedAt),
    schemaVersion: todo.schemaVersion,
  };
}

// ---------------------------------------------------------------- UserProfile

const userProfileDocumentSchema = z.object({
  email: z.string().min(1),
  displayName: z.string().min(1).nullable().default(null),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  settings: userSettingsSchema.default(defaultUserSettings),
});

export function userProfileFromDocument(id: string, data: DocumentData): UserProfile {
  const parsed = parseDocument(userProfileDocumentSchema, data, 'userProfile', id);
  return { id: asUserId(id), ...parsed };
}

export function userProfileToDocument(profile: UserProfile): DocumentData {
  return {
    email: profile.email,
    displayName: profile.displayName,
    createdAt: Timestamp.fromDate(profile.createdAt),
    updatedAt: Timestamp.fromDate(profile.updatedAt),
    settings: profile.settings,
  };
}

// -------------------------------------------------------------------- helpers

function parseDocument<TSchema extends z.ZodType>(
  schema: TSchema,
  data: DocumentData,
  kind: string,
  id: string,
): z.output<TSchema> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(racine)'} : ${issue.message}`)
      .join(' ; ');

    throw new AppError('invalid-document', `Document ${kind}/${id} invalide — ${details}`, {
      cause: result.error,
    });
  }

  return result.data;
}
