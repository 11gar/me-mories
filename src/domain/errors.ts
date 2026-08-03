/**
 * A single error type crossing the infrastructure boundary.
 *
 * Firebase throws codes like `auth/wrong-password` and `permission-denied`
 * that mean nothing to a user and change between SDK versions. Adapters
 * translate them once, here, so the UI has a closed set of cases to handle and
 * a message it can display as-is.
 */
export type AppErrorCode =
  | 'auth/invalid-credentials'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-email'
  | 'auth/too-many-requests'
  | 'auth/popup-closed'
  | 'auth/requires-recent-login'
  | 'permission-denied'
  | 'unavailable'
  | 'not-found'
  | 'invalid-document'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Last-resort wrapper so nothing unknown escapes into the UI untyped. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  return new AppError('unknown', "Une erreur inattendue s'est produite.", { cause: error });
}
