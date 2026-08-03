import type { UserId } from '../models/ids';
import type { AuthUser, UserProfile, UserSettings } from '../models/user';
import type { Unsubscribe } from './types';

export interface Credentials {
  email: string;
  password: string;
}

/**
 * The port for authentication. Not a repository, but the same idea: the app
 * talks to this, never to Firebase Auth, so the identity provider can change
 * and the views cannot accidentally couple to it.
 */
export interface AuthGateway {
  /** Fires immediately with the restored session, then on every change.
   * `null` means signed out. */
  observeUser(listener: (user: AuthUser | null) => void): Unsubscribe;

  signIn(credentials: Credentials): Promise<AuthUser>;
  signUp(credentials: Credentials & { displayName?: string }): Promise<AuthUser>;
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
}

export interface UserProfileRepository {
  get(userId: UserId): Promise<UserProfile | null>;
  /** Creates the profile document on first sign-in; a no-op afterwards. */
  ensureExists(user: AuthUser, now: Date): Promise<UserProfile>;
  updateSettings(userId: UserId, settings: UserSettings, now: Date): Promise<void>;
}
