import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';

import { asUserId } from '@/domain/models';
import type { AuthUser } from '@/domain/models';
import type { AuthGateway } from '@/domain/repositories';

import { withMappedError } from './errorMapping';

function toAuthUser(user: User): AuthUser {
  return {
    id: asUserId(user.uid),
    email: user.email ?? '',
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  };
}

export function createFirebaseAuthGateway(auth: Auth): AuthGateway {
  return {
    observeUser(listener) {
      return onAuthStateChanged(auth, (user) => {
        listener(user === null ? null : toAuthUser(user));
      });
    },

    async signIn({ email, password }) {
      const credential = await withMappedError(() =>
        signInWithEmailAndPassword(auth, email, password),
      );
      return toAuthUser(credential.user);
    },

    async signUp({ email, password, displayName }) {
      const credential = await withMappedError(() =>
        createUserWithEmailAndPassword(auth, email, password),
      );

      if (displayName !== undefined && displayName.length > 0) {
        await withMappedError(() => updateProfile(credential.user, { displayName }));
      }

      return toAuthUser(credential.user);
    },

    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      // Always ask which account: people capture memories on shared machines,
      // and silently reusing the last session is the wrong default here.
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await withMappedError(() => signInWithPopup(auth, provider));
      return toAuthUser(credential.user);
    },

    async signOut() {
      await withMappedError(() => firebaseSignOut(auth));
    },

    async sendPasswordReset(email) {
      await withMappedError(() => sendPasswordResetEmail(auth, email));
    },
  };
}
