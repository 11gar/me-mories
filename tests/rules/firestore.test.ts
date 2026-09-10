import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Executable specification of firestore.rules.
 *
 * These tests are the safety net for the two guarantees the rules exist to
 * provide: a user can never touch another user's data, and a malformed document
 * can never be written. Run with `npm run test:rules`.
 */

const PROJECT_ID = 'demo-me-mories';
const ALICE = 'alice-uid';
const BOB = 'bob-uid';

let testEnv: RulesTestEnvironment;

const now = () => Timestamp.fromDate(new Date('2026-08-02T12:00:00Z'));
const earlier = () => Timestamp.fromDate(new Date('2026-08-01T12:00:00Z'));

function aMemory(overrides: Record<string, unknown> = {}) {
  return {
    text: 'Le café Kitsuné de la rue Amelot est excellent.',
    createdAt: now(),
    updatedAt: now(),
    tagIds: [],
    dateTagIds: [],
    deletedAt: null,
    lastReviewedAt: null,
    reviewCount: 0,
    schemaVersion: 1,
    ...overrides,
  };
}

function aTag(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Café',
    titleNormalized: 'cafe',
    color: '#5b53e8',
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

function aDateTag(overrides: Record<string, unknown> = {}) {
  return {
    date: '2024-03-12',
    label: 'Voyage au Japon',
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

function aTodo(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Sortir les poubelles',
    dueDate: '2026-08-02',
    recurrence: null,
    status: 'todo',
    tagIds: [],
    seriesId: null,
    postponeCount: 0,
    completedAt: null,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function aProfile(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Alice',
    email: 'alice@example.com',
    createdAt: now(),
    updatedAt: now(),
    settings: {},
    ...overrides,
  };
}

const asAlice = () => testEnv.authenticatedContext(ALICE).firestore();
const asBob = () => testEnv.authenticatedContext(BOB).firestore();
const asAnonymous = () => testEnv.unauthenticatedContext().firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('isolation entre utilisateurs', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `users/${ALICE}/memories/m1`), aMemory());
      await setDoc(doc(db, `users/${ALICE}/tags/t1`), aTag());
      await setDoc(doc(db, `users/${ALICE}/dateTags/d1`), aDateTag());
      await setDoc(doc(db, `users/${ALICE}/todos/td1`), aTodo());
    });
  });

  it("interdit à un autre utilisateur de lire une Memory qui n'est pas la sienne", async () => {
    await assertFails(getDoc(doc(asBob(), `users/${ALICE}/memories/m1`)));
  });

  it("interdit à un autre utilisateur d'écrire dans les Memories d'autrui", async () => {
    await assertFails(setDoc(doc(asBob(), `users/${ALICE}/memories/m2`), aMemory()));
  });

  it("interdit à un autre utilisateur de supprimer une Memory qui n'est pas la sienne", async () => {
    await assertFails(updateDoc(doc(asBob(), `users/${ALICE}/memories/m1`), { text: 'détourné' }));
  });

  it('interdit toute lecture à un visiteur non authentifié', async () => {
    await assertFails(getDoc(doc(asAnonymous(), `users/${ALICE}/memories/m1`)));
    await assertFails(getDoc(doc(asAnonymous(), `users/${ALICE}/tags/t1`)));
    await assertFails(getDoc(doc(asAnonymous(), `users/${ALICE}/dateTags/d1`)));
    await assertFails(getDoc(doc(asAnonymous(), `users/${ALICE}/todos/td1`)));
  });

  it('autorise le propriétaire à lire ses propres données', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), `users/${ALICE}/memories/m1`)));
    await assertSucceeds(getDoc(doc(asAlice(), `users/${ALICE}/tags/t1`)));
    await assertSucceeds(getDoc(doc(asAlice(), `users/${ALICE}/dateTags/d1`)));
    await assertSucceeds(getDoc(doc(asAlice(), `users/${ALICE}/todos/td1`)));
  });
});

describe('validation des Memories', () => {
  it('accepte une Memory conforme', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory()));
  });

  it('refuse un texte vide', async () => {
    await assertFails(setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory({ text: '' })));
  });

  it('refuse un texte au-delà de 10 000 caractères', async () => {
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory({ text: 'a'.repeat(10_001) })),
    );
  });

  it('refuse un champ inconnu', async () => {
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory({ isAdmin: true })),
    );
  });

  it('refuse un champ obligatoire manquant', async () => {
    const { reviewCount: _omitted, ...withoutReviewCount } = aMemory();
    await assertFails(setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), withoutReviewCount));
  });

  it('refuse un type incorrect', async () => {
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory({ reviewCount: 'beaucoup' })),
    );
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory({ tagIds: 'tag-1' })),
    );
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory({ createdAt: '2026-08-02' })),
    );
  });

  it('refuse un reviewCount négatif', async () => {
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/memories/m1`), aMemory({ reviewCount: -1 })),
    );
  });

  it('accepte deletedAt et lastReviewedAt à null ou en timestamp', async () => {
    await assertSucceeds(
      setDoc(
        doc(asAlice(), `users/${ALICE}/memories/m1`),
        aMemory({ deletedAt: now(), lastReviewedAt: now(), reviewCount: 3 }),
      ),
    );
  });

  it("interdit de réécrire createdAt lors d'une mise à jour", async () => {
    const ref = doc(asAlice(), `users/${ALICE}/memories/m1`);
    await assertSucceeds(setDoc(ref, aMemory()));
    await assertFails(updateDoc(ref, { createdAt: earlier(), updatedAt: now() }));
  });

  it('autorise une mise à jour partielle qui préserve createdAt', async () => {
    const ref = doc(asAlice(), `users/${ALICE}/memories/m1`);
    await assertSucceeds(setDoc(ref, aMemory()));
    await assertSucceeds(updateDoc(ref, { text: 'Texte corrigé', updatedAt: now() }));
  });
});

describe('validation des Tags', () => {
  it('accepte un Tag conforme', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), `users/${ALICE}/tags/t1`), aTag()));
  });

  it('refuse une couleur qui n’est pas un hexadécimal à 6 chiffres', async () => {
    await assertFails(setDoc(doc(asAlice(), `users/${ALICE}/tags/t1`), aTag({ color: 'rouge' })));
    await assertFails(setDoc(doc(asAlice(), `users/${ALICE}/tags/t1`), aTag({ color: '#fff' })));
  });

  it('refuse un titre vide', async () => {
    await assertFails(setDoc(doc(asAlice(), `users/${ALICE}/tags/t1`), aTag({ title: '' })));
  });
});

describe('validation des DateTags', () => {
  it('accepte un DateTag conforme', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), `users/${ALICE}/dateTags/d1`), aDateTag()));
  });

  it('accepte un label absent', async () => {
    await assertSucceeds(
      setDoc(doc(asAlice(), `users/${ALICE}/dateTags/d1`), aDateTag({ label: null })),
    );
  });

  it('refuse une date qui ne respecte pas le format YYYY-MM-DD', async () => {
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/dateTags/d1`), aDateTag({ date: '12/03/2024' })),
    );
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/dateTags/d1`), aDateTag({ date: '2024-3-12' })),
    );
  });

  it('refuse un timestamp à la place de la date civile', async () => {
    await assertFails(
      setDoc(doc(asAlice(), `users/${ALICE}/dateTags/d1`), aDateTag({ date: now() })),
    );
  });
});

describe('validation des Todos', () => {
  const path = `users/${ALICE}/todos/td1`;

  it('accepte un Todo conforme', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), aTodo()));
  });

  it('accepte une tâche sans date ni récurrence', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), aTodo({ dueDate: null, recurrence: null })));
  });

  it('accepte une récurrence bien formée', async () => {
    await assertSucceeds(
      setDoc(doc(asAlice(), path), aTodo({ recurrence: { unit: 'day', interval: 2 } })),
    );
  });

  it('refuse un titre vide', async () => {
    await assertFails(setDoc(doc(asAlice(), path), aTodo({ title: '' })));
  });

  it('refuse un champ inconnu', async () => {
    await assertFails(setDoc(doc(asAlice(), path), aTodo({ priority: 'haute' })));
  });

  it('refuse un champ obligatoire manquant', async () => {
    const { status: _omitted, ...withoutStatus } = aTodo();

    await assertFails(setDoc(doc(asAlice(), path), withoutStatus));
  });

  it('refuse un statut hors de la liste', async () => {
    await assertFails(setDoc(doc(asAlice(), path), aTodo({ status: 'en-cours' })));
  });

  it('refuse un timestamp à la place de la date civile', async () => {
    await assertFails(setDoc(doc(asAlice(), path), aTodo({ dueDate: now() })));
  });

  it('refuse une date mal formée', async () => {
    await assertFails(setDoc(doc(asAlice(), path), aTodo({ dueDate: '02/08/2026' })));
  });

  it('refuse une récurrence dont l’unité est inconnue', async () => {
    await assertFails(
      setDoc(doc(asAlice(), path), aTodo({ recurrence: { unit: 'year', interval: 1 } })),
    );
  });

  it('refuse un intervalle de récurrence nul ou négatif', async () => {
    await assertFails(
      setDoc(doc(asAlice(), path), aTodo({ recurrence: { unit: 'day', interval: 0 } })),
    );
  });

  it('refuse une récurrence sans date de départ', async () => {
    // Une règle sans ancre ne peut produire aucune date : l’invariant est
    // vérifié côté serveur, pas seulement dans le formulaire.
    await assertFails(
      setDoc(
        doc(asAlice(), path),
        aTodo({ dueDate: null, recurrence: { unit: 'week', interval: 1 } }),
      ),
    );
  });

  it('refuse un compteur de reports négatif', async () => {
    await assertFails(setDoc(doc(asAlice(), path), aTodo({ postponeCount: -1 })));
  });

  it("interdit de réécrire createdAt lors d'une mise à jour", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), path), aTodo({ createdAt: earlier() }));
    });

    await assertFails(setDoc(doc(asAlice(), path), aTodo({ createdAt: now() })));
  });

  it('autorise une mise à jour qui préserve createdAt', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), path), aTodo({ createdAt: earlier() }));
    });

    await assertSucceeds(
      setDoc(
        doc(asAlice(), path),
        aTodo({ createdAt: earlier(), status: 'done', completedAt: now() }),
      ),
    );
  });
});

describe('profil utilisateur', () => {
  it('autorise le propriétaire à créer son profil', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), `users/${ALICE}`), aProfile()));
  });

  it("interdit de créer le profil de quelqu'un d'autre", async () => {
    await assertFails(setDoc(doc(asBob(), `users/${ALICE}`), aProfile()));
  });

  it('interdit la suppression du profil depuis le client', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `users/${ALICE}`), aProfile());
    });

    await assertFails(deleteDoc(doc(asAlice(), `users/${ALICE}`)));
  });
});
