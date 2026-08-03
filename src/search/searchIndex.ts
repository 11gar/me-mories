import MiniSearch from 'minisearch';

import type { Memory } from '@/domain/models';
import type { CollectionChange } from '@/domain/repositories';
import { normalizeText } from '@/lib/text';

/**
 * Full-text index over memory bodies.
 *
 * Firestore cannot do this at all — no full-text search, no fuzziness, no
 * ranking — so the index lives here, in front of the local read model. It is
 * updated incrementally from the same snapshot deltas that feed the store, so a
 * write costs one document update rather than a rebuild.
 *
 * Only `text` is indexed. Tag and date-tag titles are matched separately in
 * `runSearch`, against the (small) tag collections: indexing them here would
 * mean re-indexing every affected memory each time a tag is renamed.
 */
interface IndexedMemory {
  id: string;
  text: string;
}

function createIndex(): MiniSearch<IndexedMemory> {
  return new MiniSearch<IndexedMemory>({
    idField: 'id',
    fields: ['text'],
    storeFields: [],
    // Accent- and case-insensitive: "cafe" has to find "café", because nobody
    // types accents when they are in a hurry.
    processTerm: (term) => {
      const normalized = normalizeText(term);
      return normalized.length === 0 ? null : normalized;
    },
    searchOptions: {
      prefix: true,
      // Tolerates a typo roughly every five characters — enough for a
      // half-remembered word, tight enough not to return noise.
      fuzzy: 0.2,
      // Extra words narrow the search. When you are hunting one memory among
      // thousands, that is what you want.
      combineWith: 'AND',
    },
  });
}

let index = createIndex();

export const memorySearchIndex = {
  apply(changes: readonly CollectionChange<Memory>[]): void {
    for (const change of changes) {
      if (change.type === 'removed') {
        if (index.has(change.id)) index.discard(change.id);
        continue;
      }

      const document: IndexedMemory = { id: change.entity.id, text: change.entity.text };

      if (index.has(document.id)) {
        index.replace(document);
      } else {
        index.add(document);
      }
    }
  },

  /** Scores for the memories matching `query`, keyed by id. */
  search(query: string): Map<string, number> {
    const trimmed = query.trim();
    if (trimmed.length === 0) return new Map();

    return new Map(index.search(trimmed).map((result) => [result.id as string, result.score]));
  },

  /** Completions for the search box, drawn from the indexed vocabulary. */
  suggest(query: string, limit = 5): string[] {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];

    return index
      .autoSuggest(trimmed)
      .slice(0, limit)
      .map((suggestion) => suggestion.suggestion);
  },

  clear(): void {
    // A fresh instance rather than removeAll(): discarded ids linger in
    // MiniSearch's internal bookkeeping, and a sign-out should leave nothing of
    // the previous user behind.
    index = createIndex();
  },

  get size(): number {
    return index.documentCount;
  },
};
