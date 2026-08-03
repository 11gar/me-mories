import { deleteDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

import type { TagRepository } from '@/domain/repositories';

import { runBatched } from '../batch';
import { tagFromDocument, tagToDocument } from '../converters';
import { withMappedError } from '../errorMapping';
import { observeCollection } from '../observeCollection';
import { tagDoc, tagsCollection } from '../paths';

export function createFirestoreTagRepository(db: Firestore): TagRepository {
  return {
    observeAll(userId, handlers) {
      return observeCollection(tagsCollection(db, userId), tagFromDocument, handlers);
    },

    async create(userId, tag) {
      await withMappedError(() => setDoc(tagDoc(db, userId, tag.id), tagToDocument(tag)));
    },

    async update(userId, tag) {
      await withMappedError(() => setDoc(tagDoc(db, userId, tag.id), tagToDocument(tag)));
    },

    async delete(userId, tagId) {
      await withMappedError(() => deleteDoc(tagDoc(db, userId, tagId)));
    },

    async createMany(userId, tags) {
      // One round trip when capture creates several tags at once from inline
      // `#hashtags` — the difference between instant and noticeably not.
      await runBatched(db, tags, (batch, tag) => {
        batch.set(tagDoc(db, userId, tag.id), tagToDocument(tag));
      });
    },
  };
}
