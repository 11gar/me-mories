import { deleteDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

import type { DateTagRepository } from '@/domain/repositories';

import { runBatched } from '../batch';
import { dateTagFromDocument, dateTagToDocument } from '../converters';
import { withMappedError } from '../errorMapping';
import { observeCollection } from '../observeCollection';
import { dateTagDoc, dateTagsCollection } from '../paths';

export function createFirestoreDateTagRepository(db: Firestore): DateTagRepository {
  return {
    observeAll(userId, handlers) {
      return observeCollection(dateTagsCollection(db, userId), dateTagFromDocument, handlers);
    },

    async create(userId, dateTag) {
      await withMappedError(() =>
        setDoc(dateTagDoc(db, userId, dateTag.id), dateTagToDocument(dateTag)),
      );
    },

    async update(userId, dateTag) {
      await withMappedError(() =>
        setDoc(dateTagDoc(db, userId, dateTag.id), dateTagToDocument(dateTag)),
      );
    },

    async delete(userId, dateTagId) {
      await withMappedError(() => deleteDoc(dateTagDoc(db, userId, dateTagId)));
    },

    async createMany(userId, dateTags) {
      await runBatched(db, dateTags, (batch, dateTag) => {
        batch.set(dateTagDoc(db, userId, dateTag.id), dateTagToDocument(dateTag));
      });
    },
  };
}
