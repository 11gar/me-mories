import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { AuthUser } from '@/domain/models';
import type { Credentials } from '@/domain/repositories';
import { authGateway, userProfileRepository } from '@/infrastructure/firebase';

import { AuthContext } from './authContext';
import type { AuthStatus } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    return authGateway.observeUser((nextUser) => {
      setUser(nextUser);
      setStatus(nextUser === null ? 'anonymous' : 'authenticated');

      if (nextUser !== null) {
        // Fire and forget: the profile document carries settings, not data the
        // app needs to render, so a slow or failed write must not hold up the
        // session. It is retried on the next sign-in.
        void userProfileRepository.ensureExists(nextUser, new Date()).catch((error: unknown) => {
          console.error('[auth] Création du profil utilisateur impossible.', error);
        });
      }
    });
  }, []);

  const signIn = useCallback(async (credentials: Credentials) => {
    await authGateway.signIn(credentials);
  }, []);

  const signUp = useCallback(async (credentials: Credentials & { displayName?: string }) => {
    await authGateway.signUp(credentials);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authGateway.signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    await authGateway.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await authGateway.sendPasswordReset(email);
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signInWithGoogle, signOut, sendPasswordReset }),
    [status, user, signIn, signUp, signInWithGoogle, signOut, sendPasswordReset],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
