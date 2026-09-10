import { asDateTagId, asIsoDate, asMemoryId, asTagId, asTodoId } from '@/domain/models';
import type { DateTag, Memory, Tag, Todo } from '@/domain/models';

/**
 * Test fixtures.
 *
 * Every field has a sensible default so a test only states what it actually
 * cares about — which keeps the intent of each assertion visible.
 */

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`;

export function resetFactorySequence(): void {
  sequence = 0;
}

export function makeMemory(overrides: Partial<Memory> = {}): Memory {
  const createdAt = overrides.createdAt ?? new Date(2026, 0, 1);

  return {
    id: asMemoryId(nextId('memory')),
    text: 'Une information à retenir.',
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    tagIds: [],
    dateTagIds: [],
    deletedAt: null,
    lastReviewedAt: null,
    reviewCount: 0,
    schemaVersion: 1,
    ...overrides,
  };
}

export function makeTag(overrides: Partial<Tag> = {}): Tag {
  const createdAt = overrides.createdAt ?? new Date(2026, 0, 1);

  return {
    id: asTagId(nextId('tag')),
    title: 'Café',
    titleNormalized: 'cafe',
    color: '#5b53e8',
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    ...overrides,
  };
}

export function makeDateTag(overrides: Partial<DateTag> = {}): DateTag {
  const createdAt = overrides.createdAt ?? new Date(2026, 0, 1);

  return {
    id: asDateTagId(nextId('date-tag')),
    date: asIsoDate('2024-03-12'),
    label: 'Voyage au Japon',
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    ...overrides,
  };
}

export function makeTodo(overrides: Partial<Todo> = {}): Todo {
  const createdAt = overrides.createdAt ?? new Date(2026, 0, 1);

  return {
    id: asTodoId(nextId('todo')),
    title: 'Faire les courses',
    dueDate: null,
    recurrence: null,
    status: 'todo',
    tagIds: [],
    seriesId: null,
    postponeCount: 0,
    completedAt: null,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    deletedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

/** Deterministic stand-in for Math.random, cycling through fixed values. */
export function fixedRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}
