import { describe, expect, it } from 'vitest';

import { asIsoDate } from '@/domain/models';
import { emptySearchCriteria } from '@/domain/services/searchQuery';
import type { SearchCriteria } from '@/domain/services/searchQuery';
import { makeDateTag, makeMemory, makeTag } from '@/test/factories';

import { runSearch } from './runSearch';
import type { SearchInput } from './runSearch';

const criteria = (overrides: Partial<SearchCriteria> = {}): SearchCriteria => ({
  ...emptySearchCriteria,
  ...overrides,
});

/** Stand-in for MiniSearch: scores whatever the test says matches. */
const scoresFor = (entries: Record<string, number>) => () => new Map(Object.entries(entries));

const noScores = () => new Map<string, number>();

function search(overrides: Partial<SearchInput>): ReturnType<typeof runSearch> {
  return runSearch({
    memories: [],
    tags: [],
    dateTags: [],
    criteria: criteria(),
    textScores: noScores,
    ...overrides,
  });
}

describe('runSearch', () => {
  it('renvoie tout, du plus récent au plus ancien, sans critère', () => {
    const older = makeMemory({ createdAt: new Date(2024, 0, 1) });
    const newer = makeMemory({ createdAt: new Date(2026, 0, 1) });

    const results = search({ memories: [older, newer] });

    expect(results.map((memory) => memory.id)).toEqual([newer.id, older.id]);
  });

  it('respecte le tri demandé', () => {
    const older = makeMemory({ createdAt: new Date(2024, 0, 1) });
    const newer = makeMemory({ createdAt: new Date(2026, 0, 1) });

    const results = search({ memories: [newer, older], criteria: criteria({ sort: 'oldest' }) });

    expect(results.map((memory) => memory.id)).toEqual([older.id, newer.id]);
  });

  it('applique les filtres structurels avant le texte', () => {
    const kept = makeMemory();
    const trashed = makeMemory({ deletedAt: new Date() });

    const results = search({
      memories: [kept, trashed],
      criteria: criteria({ text: 'quoi' }),
      textScores: scoresFor({ [kept.id]: 5, [trashed.id]: 9 }),
    });

    expect(results.map((memory) => memory.id)).toEqual([kept.id]);
  });

  it('écarte les mémoires que le texte ne matche pas', () => {
    const matching = makeMemory();
    const other = makeMemory();

    const results = search({
      memories: [matching, other],
      criteria: criteria({ text: 'café' }),
      textScores: scoresFor({ [matching.id]: 3 }),
    });

    expect(results.map((memory) => memory.id)).toEqual([matching.id]);
  });

  it('classe par pertinence décroissante', () => {
    const weak = makeMemory();
    const strong = makeMemory();

    const results = search({
      memories: [weak, strong],
      criteria: criteria({ text: 'café' }),
      textScores: scoresFor({ [weak.id]: 1, [strong.id]: 8 }),
    });

    expect(results.map((memory) => memory.id)).toEqual([strong.id, weak.id]);
  });

  it('départage deux pertinences égales par la date', () => {
    const older = makeMemory({ createdAt: new Date(2024, 0, 1) });
    const newer = makeMemory({ createdAt: new Date(2026, 0, 1) });

    const results = search({
      memories: [older, newer],
      criteria: criteria({ text: 'café' }),
      textScores: scoresFor({ [older.id]: 5, [newer.id]: 5 }),
    });

    expect(results.map((memory) => memory.id)).toEqual([newer.id, older.id]);
  });

  describe('correspondance par tag', () => {
    it('trouve une mémoire dont un tag porte le mot cherché, même absent du texte', () => {
      const tag = makeTag({ title: 'Japon', titleNormalized: 'japon' });
      const tagged = makeMemory({ tagIds: [tag.id] });

      const results = search({
        memories: [tagged],
        tags: [tag],
        criteria: criteria({ text: 'japon' }),
        textScores: noScores,
      });

      expect(results.map((memory) => memory.id)).toEqual([tagged.id]);
    });

    it('fait remonter la correspondance par tag devant une correspondance textuelle', () => {
      const tag = makeTag({ title: 'Japon', titleNormalized: 'japon' });
      const tagged = makeMemory({ tagIds: [tag.id] });
      const mentioned = makeMemory();

      const results = search({
        memories: [mentioned, tagged],
        tags: [tag],
        criteria: criteria({ text: 'japon' }),
        textScores: scoresFor({ [mentioned.id]: 9 }),
      });

      expect(results.map((memory) => memory.id)).toEqual([tagged.id, mentioned.id]);
    });

    it('ignore les accents et la casse', () => {
      const tag = makeTag({ title: 'Café', titleNormalized: 'cafe' });
      const tagged = makeMemory({ tagIds: [tag.id] });

      const results = search({
        memories: [tagged],
        tags: [tag],
        criteria: criteria({ text: 'CAFÉ' }),
      });

      expect(results).toHaveLength(1);
    });

    it('matche aussi le libellé d’un DateTag', () => {
      const dateTag = makeDateTag({ label: 'Voyage au Japon', date: asIsoDate('2019-05-04') });
      const tagged = makeMemory({ dateTagIds: [dateTag.id] });

      const results = search({
        memories: [tagged],
        dateTags: [dateTag],
        criteria: criteria({ text: 'voyage' }),
      });

      expect(results).toHaveLength(1);
    });

    it('matche la date elle-même', () => {
      const dateTag = makeDateTag({ label: null, date: asIsoDate('2019-05-04') });
      const tagged = makeMemory({ dateTagIds: [dateTag.id] });

      const results = search({
        memories: [tagged],
        dateTags: [dateTag],
        criteria: criteria({ text: '2019-05' }),
      });

      expect(results).toHaveLength(1);
    });
  });

  it('combine texte et filtre par tag', () => {
    const tag = makeTag();
    const matchingBoth = makeMemory({ tagIds: [tag.id] });
    const matchingTextOnly = makeMemory();

    const results = search({
      memories: [matchingBoth, matchingTextOnly],
      tags: [tag],
      criteria: criteria({ text: 'note', tagIds: [tag.id] }),
      textScores: scoresFor({ [matchingBoth.id]: 4, [matchingTextOnly.id]: 6 }),
    });

    expect(results.map((memory) => memory.id)).toEqual([matchingBoth.id]);
  });
});
