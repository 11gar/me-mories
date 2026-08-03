import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

import { emulatorConfig, firebaseConfig } from '@/config/env';

export const firebaseApp = initializeApp(firebaseConfig);

/**
 * Firestore with IndexedDB persistence.
 *
 * This is what makes the local-first read model affordable: a cold start reads
 * the collections from disk instead of the network, and only the documents that
 * changed since are actually fetched. It is also what makes writes work
 * offline — they queue locally and replay on reconnection.
 *
 * `persistentMultipleTabManager` keeps the cache coherent when the app is open
 * in several tabs, which would otherwise fail outright.
 */
export const firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const firebaseAuth = getAuth(firebaseApp);

if (emulatorConfig.enabled) {
  const { host, authPort, firestorePort } = emulatorConfig;

  connectAuthEmulator(firebaseAuth, `http://${host}:${authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(firestore, host, firestorePort);
}
