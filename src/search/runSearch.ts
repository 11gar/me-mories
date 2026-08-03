import type { DateTag, Memory, Tag } from '@/domain/models';
import { compareBySort, matchesStructuralCriteria } from '@/domain/services/searchQuery';
import type { SearchCriteria } from '@/domain/services/searchQuery';
import { normalizeText } from '@/lib/text';

/**
 * Bonus applied when the query matches a tag or date-tag title rather than the
 * body text. Set above typical MiniSearch scores so that searching "japon"
 * surfaces the memories *tagged* #japon first — those are almost always the
 * ones being looked for.
 */
const TAG_MATCH_SCORE = 100;

export interface SearchInput {
  memories: readonly Memory[];
  tags: readonly Tag[];
  dateTags: readonly DateTag[];
  criteria: SearchCriteria;
  /** Injected so this stays a pure function, testable without the index. */
  textScores: (query: string) => Map<string, number>;
}

/**
 * Applies the full search: structural filters, then free text, then ordering.
 *
 * Kept pure and separate from the React hook so the interesting part — how
 * criteria combine — is testable without a store, an index or a renderer.
 */
export function runSearch({
  memories,
  tags,
  dateTags,
  criteria,
  textScores,
}: SearchInput): Memory[] {
  const filtered = memories.filter((memory) => matchesStructuralCriteria(memory, criteria));

  const query = criteria.text.trim();
  if (query.length === 0) {
    return [...filtered].sort(compareBySort(criteria.sort));
  }

  const scores = textScores(query);
  const matchingTagIds = titleMatches(tags, dateTags, query);

  const scored: { memory: Memory; score: number }[] = [];

  for (const memory of filtered) {
    const textScore = scores.get(memory.id) ?? 0;
    const taggedMatch =
      memory.tagIds.some((id) => matchingTagIds.has(id)) ||
      memory.dateTagIds.some((id) => matchingTagIds.has(id));

    if (textScore === 0 && !taggedMatch) continue;

    scored.push({ memory, score: textScore + (taggedMatch ? TAG_MATCH_SCORE : 0) });
  }

  if (criteria.sort === 'relevance') {
    // Recency breaks ties, so equally relevant memories read newest first.
    scored.sort(
      (a, b) => b.score - a.score || b.memory.createdAt.getTime() - a.memory.createdAt.getTime(),
    );
    return scored.map((entry) => entry.memory);
  }

  return scored.map((entry) => entry.memory).sort(compareBySort(criteria.sort));
}

/** Ids of tags and date tags whose title or label matches the query. */
function titleMatches(
  tags: readonly Tag[],
  dateTags: readonly DateTag[],
  query: string,
): Set<string> {
  const needle = normalizeText(query);
  if (needle.length === 0) return new Set();

  const matched = new Set<string>();

  for (const tag of tags) {
    if (tag.titleNormalized.includes(needle)) matched.add(tag.id);
  }

  for (const dateTag of dateTags) {
    const haystack = normalizeText(`${dateTag.label ?? ''} ${dateTag.date}`);
    if (haystack.includes(needle)) matched.add(dateTag.id);
  }

  return matched;
}
