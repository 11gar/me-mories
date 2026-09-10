import { createFirebaseAuthGateway } from './authService';
import { firebaseAuth, firestore } from './client';
import { createFirestoreDateTagRepository } from './repositories/firestoreDateTagRepository';
import { createFirestoreMemoryRepository } from './repositories/firestoreMemoryRepository';
import { createFirestoreTagRepository } from './repositories/firestoreTagRepository';
import { createFirestoreTodoRepository } from './repositories/firestoreTodoRepository';
import { createFirestoreUserProfileRepository } from './repositories/firestoreUserProfileRepository';

/**
 * The wired-up Firebase adapters.
 *
 * Everything above this layer depends on the domain interfaces, never on these
 * concrete values — swapping backends, or dropping in fakes for a test, means
 * substituting this module and nothing else.
 */
export const authGateway = createFirebaseAuthGateway(firebaseAuth);
export const userProfileRepository = createFirestoreUserProfileRepository(firestore);
export const memoryRepository = createFirestoreMemoryRepository(firestore);
export const tagRepository = createFirestoreTagRepository(firestore);
export const dateTagRepository = createFirestoreDateTagRepository(firestore);
export const todoRepository = createFirestoreTodoRepository(firestore);

export { firebaseApp, firebaseAuth, firestore } from './client';
export { mapFirebaseError } from './errorMapping';
