import { FirebaseError } from 'firebase/app';

import { AppError, isAppError } from '@/domain/errors';
import type { AppErrorCode } from '@/domain/errors';

/**
 * Translates Firebase error codes into the app's closed error set, once, at the
 * boundary.
 *
 * Firebase codes are implementation detail — they change between SDK versions
 * (`auth/wrong-password` became `auth/invalid-credential`) and read like
 * stack traces. Mapping them here means the UI handles a handful of known cases
 * and always has a message it can show as-is.
 */
const CODE_MAP: Record<string, { code: AppErrorCode; message: string }> = {
  'auth/invalid-credential': {
    code: 'auth/invalid-credentials',
    message: 'Adresse e-mail ou mot de passe incorrect.',
  },
  'auth/wrong-password': {
    code: 'auth/invalid-credentials',
    message: 'Adresse e-mail ou mot de passe incorrect.',
  },
  'auth/user-not-found': {
    code: 'auth/invalid-credentials',
    message: 'Adresse e-mail ou mot de passe incorrect.',
  },
  // Returned as PASSWORD_LOGIN_DISABLED by the REST API. This is a project
  // misconfiguration, not a user mistake, so the message says where to fix it —
  // "identifiants incorrects" would send someone hunting for a typo forever.
  'auth/operation-not-allowed': {
    code: 'auth/operation-not-allowed',
    message:
      "Ce mode de connexion n'est pas activé sur le projet Firebase " +
      '(console → Authentication → Sign-in method).',
  },
  // Firebase now returns a single opaque code instead of distinguishing
  // "unknown email" from "wrong password", to avoid leaking which accounts exist.
  'auth/invalid-login-credentials': {
    code: 'auth/invalid-credentials',
    message: 'Adresse e-mail ou mot de passe incorrect.',
  },
  'auth/user-disabled': {
    code: 'auth/invalid-credentials',
    message: 'Ce compte a été désactivé.',
  },
  // Raised when the site's domain is missing from Authentication → Settings →
  // Authorized domains. Only affects the OAuth providers.
  'auth/unauthorized-domain': {
    code: 'auth/unauthorized-domain',
    message:
      "Ce domaine n'est pas autorisé pour la connexion Google " +
      '(console Firebase → Authentication → Settings → Authorized domains).',
  },
  'auth/invalid-api-key': {
    code: 'configuration',
    message: 'Clé API Firebase invalide : vérifiez les variables d’environnement du déploiement.',
  },
  'auth/invalid-email': {
    code: 'auth/invalid-email',
    message: "Cette adresse e-mail n'est pas valide.",
  },
  'auth/email-already-in-use': {
    code: 'auth/email-already-in-use',
    message: 'Un compte existe déjà avec cette adresse e-mail.',
  },
  'auth/weak-password': {
    code: 'auth/weak-password',
    message: 'Le mot de passe doit contenir au moins 6 caractères.',
  },
  'auth/too-many-requests': {
    code: 'auth/too-many-requests',
    message: 'Trop de tentatives. Réessayez dans quelques minutes.',
  },
  'auth/popup-closed-by-user': {
    code: 'auth/popup-closed',
    message: 'La fenêtre de connexion a été fermée.',
  },
  'auth/cancelled-popup-request': {
    code: 'auth/popup-closed',
    message: 'La fenêtre de connexion a été fermée.',
  },
  'auth/requires-recent-login': {
    code: 'auth/requires-recent-login',
    message: 'Pour des raisons de sécurité, reconnectez-vous avant de poursuivre.',
  },
  'auth/network-request-failed': {
    code: 'unavailable',
    message: 'Connexion impossible. Vérifiez votre accès réseau.',
  },
  'permission-denied': {
    code: 'permission-denied',
    message: "Vous n'avez pas accès à cette donnée.",
  },
  unavailable: {
    code: 'unavailable',
    message: 'Service indisponible. Les modifications seront synchronisées au retour du réseau.',
  },
  'not-found': {
    code: 'not-found',
    message: 'Cet élément est introuvable. Il a peut-être été supprimé.',
  },
};

export function mapFirebaseError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof FirebaseError) {
    const mapped = CODE_MAP[error.code];

    if (mapped) {
      return new AppError(mapped.code, mapped.message, { cause: error });
    }

    // An unmapped code is a gap in CODE_MAP, and hiding it behind "une erreur
    // inattendue" is how a one-line configuration problem turns into an hour of
    // guessing. Surface the raw code and log the original: the user still gets a
    // readable sentence, and whoever debugs it gets something to search for.
    console.error(`[firebase] Code d'erreur non mappé : ${error.code}`, error);

    return new AppError(
      'unknown',
      `Une erreur inattendue s'est produite (${error.code}).`,
      { cause: error },
    );
  }

  console.error('[firebase] Erreur non-Firebase remontée jusqu’au mapping.', error);

  return new AppError('unknown', "Une erreur inattendue s'est produite.", { cause: error });
}

/** Wraps an async call so callers only ever see an `AppError`. */
export async function withMappedError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}
