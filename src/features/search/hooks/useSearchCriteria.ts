import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { criteriaFromSearchParams, criteriaToSearchParams } from '@/domain/services/searchQuery';
import type { SearchCriteria } from '@/domain/services/searchQuery';

/**
 * Search criteria, stored in the URL rather than in component state.
 *
 * A search survives a reload, works with the back button, and can be
 * bookmarked or shared — all of which matter for an app whose job is finding an
 * old note again. Only non-default values are written, so the URL stays
 * readable.
 */
export function useSearchCriteria(): {
  criteria: SearchCriteria;
  setCriteria: (next: SearchCriteria) => void;
  patchCriteria: (patch: Partial<SearchCriteria>) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const criteria = useMemo(() => criteriaFromSearchParams(searchParams), [searchParams]);

  const setCriteria = useCallback(
    (next: SearchCriteria) => {
      // `replace` so typing in the search box does not bury the previous page
      // under a hundred history entries.
      setSearchParams(criteriaToSearchParams(next), { replace: true });
    },
    [setSearchParams],
  );

  const patchCriteria = useCallback(
    (patch: Partial<SearchCriteria>) => {
      setCriteria({ ...criteria, ...patch });
    },
    [criteria, setCriteria],
  );

  return { criteria, setCriteria, patchCriteria };
}
