import { z } from 'zod';

/**
 * Branded identifiers.
 *
 * A Memory carries arrays of tag ids and date-tag ids, and lookups happen by id
 * everywhere. Plain `string` would let a TagId reach a function expecting a
 * MemoryId with no complaint from the compiler — exactly the kind of mistake
 * that surfaces as a silently empty list rather than an error.
 *
 * `asXId` is an unchecked cast, for values already known to be valid (a
 * Firestore document id, a value read back from the store). Use the schema's
 * `parse` for anything coming from outside — a URL, a form, a raw document.
 */

export const userIdSchema = z.string().min(1).brand<'UserId'>();
export type UserId = z.infer<typeof userIdSchema>;
export const asUserId = (value: string): UserId => value as UserId;

export const memoryIdSchema = z.string().min(1).brand<'MemoryId'>();
export type MemoryId = z.infer<typeof memoryIdSchema>;
export const asMemoryId = (value: string): MemoryId => value as MemoryId;

export const tagIdSchema = z.string().min(1).brand<'TagId'>();
export type TagId = z.infer<typeof tagIdSchema>;
export const asTagId = (value: string): TagId => value as TagId;

export const dateTagIdSchema = z.string().min(1).brand<'DateTagId'>();
export type DateTagId = z.infer<typeof dateTagIdSchema>;
export const asDateTagId = (value: string): DateTagId => value as DateTagId;

export const todoIdSchema = z.string().min(1).brand<'TodoId'>();
export type TodoId = z.infer<typeof todoIdSchema>;
export const asTodoId = (value: string): TodoId => value as TodoId;
