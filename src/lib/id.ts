/**
 * Generates an identifier for a new entity.
 *
 * Ids are minted client-side rather than by Firestore so that an entity is
 * complete the moment it is created — the UI can render and link it before the
 * write is acknowledged, which is what makes capture feel instant and offline
 * creation work at all.
 */
export function createId(): string {
  return crypto.randomUUID();
}
