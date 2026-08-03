import { useMemo } from 'react';

import type { Memory } from '@/domain/models';
import type { SearchCriteria } from '@/domain/services/searchQuery';
import { useDateTagsStore, useMemoriesStore, useTagsStore } from '@/store';

import { runSearch } from './runSearch';
import { memorySearchIndex } from './searchIndex';

/**
 * Runs the advanced search against the in-memory read model.
 *
 * No network, no loading state, no composite index — which is the whole point
 * of syncing locally. Results recompute only when the criteria or the
 * underlying collections change.
 */
export function useSearchResults(criteria: SearchCriteria): Memory[] {
  const memories = useMemoriesStore((state) =>
    criteria.scope === 'trash' ? state.trashed : state.active,
  );
  const tags = useTagsStore((state) => state.all);
  const dateTags = useDateTagsStore((state) => state.all);

  return useMemo(
    () =>
      runSearch({
        memories,
        tags,
        dateTags,
        criteria,
        textScores: (query) => memorySearchIndex.search(query),
      }),
    [memories, tags, dateTags, criteria],
  );
}
