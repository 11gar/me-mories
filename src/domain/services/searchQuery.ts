import { asDateTagId, asTagId } from '../models/ids';
import type { DateTagId, TagId } from '../models/ids';
import { asIsoDate, fromIsoDate, isIsoDate } from '../models/isoDate';
import type { IsoDate } from '../models/isoDate';
import { isDeleted } from '../models/memory';
import type { Memory } from '../models/memory';

/**
 * The advanced search, expressed as data.
 *
 * Criteria are a plain value so they can be serialised into the URL, compared,
 * and applied by pure functions. Free-text matching is *not* handled here — it
 * is delegated to the MiniSearch index in `src/search`, which knows about
 * fuzziness and ranking. This module owns the structural filters.
 */
export interface SearchCriteria {
  text: string;
  tagIds: TagId[];
  dateTagIds: DateTagId[];
  /** `all` narrows (AND), `any` widens (OR). Narrowing is the useful default
   * when you are hunting for one specific memory. */
  tagMatch: TagMatchMode;
  createdFrom: IsoDate | null;
  createdTo: IsoDate | null;
  /** Only memories with no tag and no date tag — the swipe-mode backlog. */
  untaggedOnly: boolean;
  scope: SearchScope;
  sort: SortOrder;
}

export const TAG_MATCH_MODES = ['all', 'any'] as const;
export const SEARCH_SCOPES = ['active', 'trash'] as const;
export const SORT_ORDERS = ['relevance', 'newest', 'oldest', 'updated'] as const;

export type TagMatchMode = (typeof TAG_MATCH_MODES)[number];
export type SearchScope = (typeof SEARCH_SCOPES)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export const emptySearchCriteria: SearchCriteria = {
  text: '',
  tagIds: [],
  dateTagIds: [],
  tagMatch: 'all',
  createdFrom: null,
  createdTo: null,
  untaggedOnly: false,
  scope: 'active',
  // `relevance` degrades to newest-first when there is no text query (see
  // compareBySort), so one default covers both browsing and searching.
  sort: 'relevance',
};

export function hasActiveFilters(criteria: SearchCriteria): boolean {
  return (
    criteria.text.trim().length > 0 ||
    criteria.tagIds.length > 0 ||
    criteria.dateTagIds.length > 0 ||
    criteria.createdFrom !== null ||
    criteria.createdTo !== null ||
    criteria.untaggedOnly
  );
}

/**
 * Clears every filter but keeps the scope: someone emptying their criteria
 * while looking at the trash means "show me all of the trash", not "take me
 * back to my active memories".
 */
export function resetCriteria(criteria: SearchCriteria): SearchCriteria {
  return { ...emptySearchCriteria, scope: criteria.scope };
}

export function countActiveFilters(criteria: SearchCriteria): number {
  let count = 0;
  if (criteria.tagIds.length > 0) count += 1;
  if (criteria.dateTagIds.length > 0) count += 1;
  if (criteria.createdFrom !== null || criteria.createdTo !== null) count += 1;
  if (criteria.untaggedOnly) count += 1;
  return count;
}

/**
 * Every filter except free text. Returns true when the memory survives.
 */
export function matchesStructuralCriteria(memory: Memory, criteria: SearchCriteria): boolean {
  const inTrash = isDeleted(memory);
  if (criteria.scope === 'trash' ? !inTrash : inTrash) return false;

  if (criteria.untaggedOnly && (memory.tagIds.length > 0 || memory.dateTagIds.length > 0)) {
    return false;
  }

  if (
    criteria.tagIds.length > 0 &&
    !matchesTags(memory.tagIds, criteria.tagIds, criteria.tagMatch)
  ) {
    return false;
  }

  if (
    criteria.dateTagIds.length > 0 &&
    !matchesTags(memory.dateTagIds, criteria.dateTagIds, criteria.tagMatch)
  ) {
    return false;
  }

  return matchesCreationWindow(memory, criteria);
}

function matchesTags(
  memoryIds: readonly string[],
  wantedIds: readonly string[],
  mode: TagMatchMode,
): boolean {
  const owned = new Set(memoryIds);
  return mode === 'all'
    ? wantedIds.every((id) => owned.has(id))
    : wantedIds.some((id) => owned.has(id));
}

function matchesCreationWindow(memory: Memory, criteria: SearchCriteria): boolean {
  if (criteria.createdFrom !== null) {
    // Inclusive: a memory created at any time on the "from" day counts.
    if (memory.createdAt < fromIsoDate(criteria.createdFrom)) return false;
  }

  if (criteria.createdTo !== null) {
    const dayAfter = fromIsoDate(criteria.createdTo);
    dayAfter.setDate(dayAfter.getDate() + 1);
    if (memory.createdAt >= dayAfter) return false;
  }

  return true;
}

export function compareBySort(sort: SortOrder): (a: Memory, b: Memory) => number {
  switch (sort) {
    case 'oldest':
      return (a, b) => a.createdAt.getTime() - b.createdAt.getTime();
    case 'updated':
      return (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime();
    // Relevance ranking happens in `runSearch`, which has the scores. With no
    // query there is nothing to rank, so it falls back to recency.
    case 'relevance':
    case 'newest':
      return (a, b) => b.createdAt.getTime() - a.createdAt.getTime();
  }
}

// ---------------------------------------------------------------------------
// URL serialisation
//
// Criteria live in the query string so a search survives a reload, works with
// the back button, and can be bookmarked or shared. Only non-default values are
// written, keeping the URL readable.
// ---------------------------------------------------------------------------

const PARAM = {
  text: 'q',
  tags: 'tags',
  dateTags: 'dates',
  tagMatch: 'match',
  from: 'from',
  to: 'to',
  untagged: 'untagged',
  scope: 'scope',
  sort: 'sort',
} as const;

export function criteriaToSearchParams(criteria: SearchCriteria): URLSearchParams {
  const params = new URLSearchParams();

  if (criteria.text.trim().length > 0) params.set(PARAM.text, criteria.text.trim());
  if (criteria.tagIds.length > 0) params.set(PARAM.tags, criteria.tagIds.join(','));
  if (criteria.dateTagIds.length > 0) params.set(PARAM.dateTags, criteria.dateTagIds.join(','));
  if (criteria.tagMatch !== emptySearchCriteria.tagMatch)
    params.set(PARAM.tagMatch, criteria.tagMatch);
  if (criteria.createdFrom !== null) params.set(PARAM.from, criteria.createdFrom);
  if (criteria.createdTo !== null) params.set(PARAM.to, criteria.createdTo);
  if (criteria.untaggedOnly) params.set(PARAM.untagged, '1');
  if (criteria.scope !== emptySearchCriteria.scope) params.set(PARAM.scope, criteria.scope);
  if (criteria.sort !== emptySearchCriteria.sort) params.set(PARAM.sort, criteria.sort);

  return params;
}

export function criteriaFromSearchParams(params: URLSearchParams): SearchCriteria {
  // Fallbacks come from `emptySearchCriteria` rather than repeated literals:
  // serialisation omits default values, so a drift between the two would make
  // a default silently unrepresentable in the URL.
  return {
    text: params.get(PARAM.text) ?? emptySearchCriteria.text,
    tagIds: readIdList(params.get(PARAM.tags)).map(asTagId),
    dateTagIds: readIdList(params.get(PARAM.dateTags)).map(asDateTagId),
    tagMatch: readEnum(params.get(PARAM.tagMatch), TAG_MATCH_MODES, emptySearchCriteria.tagMatch),
    createdFrom: readIsoDate(params.get(PARAM.from)),
    createdTo: readIsoDate(params.get(PARAM.to)),
    untaggedOnly: params.get(PARAM.untagged) === '1',
    scope: readEnum(params.get(PARAM.scope), SEARCH_SCOPES, emptySearchCriteria.scope),
    sort: readEnum(params.get(PARAM.sort), SORT_ORDERS, emptySearchCriteria.sort),
  };
}

function readIdList(value: string | null): string[] {
  if (value === null) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readIsoDate(value: string | null): IsoDate | null {
  if (value === null || !isIsoDate(value)) return null;
  return asIsoDate(value);
}

function readEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export const SORT_LABELS: Record<SortOrder, string> = {
  relevance: 'Pertinence',
  newest: 'Plus récentes',
  oldest: 'Plus anciennes',
  updated: 'Modifiées récemment',
};
