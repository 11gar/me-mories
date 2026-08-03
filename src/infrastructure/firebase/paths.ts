import { collection, doc } from 'firebase/firestore';
import type { CollectionReference, DocumentReference, Firestore } from 'firebase/firestore';

import type { DateTagId, MemoryId, TagId, UserId } from '@/domain/models';

/**
 * Every collection path in one place.
 *
 * Paths are built through these helpers rather than inline strings so that a
 * typo cannot silently create a parallel, invisible collection — Firestore will
 * happily write to `users/{uid}/memorys` and never complain.
 */
export const COLLECTIONS = {
  users: 'users',
  memories: 'memories',
  tags: 'tags',
  dateTags: 'dateTags',
} as const;

export const userDoc = (db: Firestore, userId: UserId): DocumentReference =>
  doc(db, COLLECTIONS.users, userId);

export const memoriesCollection = (db: Firestore, userId: UserId): CollectionReference =>
  collection(db, COLLECTIONS.users, userId, COLLECTIONS.memories);

export const memoryDoc = (db: Firestore, userId: UserId, memoryId: MemoryId): DocumentReference =>
  doc(db, COLLECTIONS.users, userId, COLLECTIONS.memories, memoryId);

export const tagsCollection = (db: Firestore, userId: UserId): CollectionReference =>
  collection(db, COLLECTIONS.users, userId, COLLECTIONS.tags);

export const tagDoc = (db: Firestore, userId: UserId, tagId: TagId): DocumentReference =>
  doc(db, COLLECTIONS.users, userId, COLLECTIONS.tags, tagId);

export const dateTagsCollection = (db: Firestore, userId: UserId): CollectionReference =>
  collection(db, COLLECTIONS.users, userId, COLLECTIONS.dateTags);

export const dateTagDoc = (
  db: Firestore,
  userId: UserId,
  dateTagId: DateTagId,
): DocumentReference => doc(db, COLLECTIONS.users, userId, COLLECTIONS.dateTags, dateTagId);
