import { Timestamp, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

import { defaultUserSettings } from '@/domain/models';
import type { UserId, UserProfile } from '@/domain/models';
import type { UserProfileRepository } from '@/domain/repositories';

import { userProfileFromDocument, userProfileToDocument } from '../converters';
import { withMappedError } from '../errorMapping';
import { userDoc } from '../paths';

export function createFirestoreUserProfileRepository(db: Firestore): UserProfileRepository {
  async function get(userId: UserId): Promise<UserProfile | null> {
    const snapshot = await withMappedError(() => getDoc(userDoc(db, userId)));
    if (!snapshot.exists()) return null;

    return userProfileFromDocument(snapshot.id, snapshot.data());
  }

  return {
    get,

    async ensureExists(user, now) {
      const existing = await get(user.id);
      if (existing !== null) return existing;

      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: now,
        updatedAt: now,
        settings: defaultUserSettings,
      };

      await withMappedError(() => setDoc(userDoc(db, user.id), userProfileToDocument(profile)));

      return profile;
    },

    async updateSettings(userId, settings, now) {
      await withMappedError(() =>
        updateDoc(userDoc(db, userId), { settings, updatedAt: Timestamp.fromDate(now) }),
      );
    },
  };
}
