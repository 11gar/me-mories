import { createContext, use } from 'react';

import type { AuthUser } from '@/domain/models';
import type { Credentials } from '@/domain/repositories';

/**
 * `loading` is a distinct state on purpose: Firebase restores a session
 * asynchronously, and treating "not yet known" as "signed out" would bounce a
 * returning user to the login screen for a frame on every cold start.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (credentials: Credentials) => Promise<void>;
  signUp: (credentials: Credentials & { displayName?: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);

  if (value === null) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.');
  }

  return value;
}

/** For the many screens that only run once a user is known to be signed in. */
export function useAuthenticatedUser(): AuthUser {
  const { user } = useAuth();

  if (user === null) {
    throw new Error('useAuthenticatedUser a été appelé hors d’une route protégée.');
  }

  return user;
}
