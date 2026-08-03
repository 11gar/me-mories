import { toIsoDate } from '../models/isoDate';
import type { IsoDate } from '../models/isoDate';
import { isActive, isDeleted, isUntagged } from '../models/memory';
import type { Memory } from '../models/memory';

/**
 * Light statistics for the home page.
 *
 * The goal is motivational, not analytical: show enough to make the base feel
 * alive and worth revisiting. Everything is computed from the in-memory store,
 * so it costs one pass over the array and no extra reads.
 */
export interface MemoryStats {
  total: number;
  inTrash: number;
  untagged: number;
  createdToday: number;
  createdThisWeek: number;
  createdThisMonth: number;
  /** Consecutive days up to today with at least one capture. */
  currentStreak: number;
  longestStreak: number;
  /** Distinct days that have at least one memory. */
  activeDays: number;
  firstCaptureAt: Date | null;
}

export function computeStats(memories: readonly Memory[], now: Date = new Date()): MemoryStats {
  const active = memories.filter(isActive);
  const today = toIsoDate(now);
  const startOfWeek = startOfIsoWeek(now);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const daysWithCapture = new Set<IsoDate>();
  let createdToday = 0;
  let createdThisWeek = 0;
  let createdThisMonth = 0;
  let firstCaptureAt: Date | null = null;

  for (const memory of active) {
    const day = toIsoDate(memory.createdAt);
    daysWithCapture.add(day);

    if (day === today) createdToday += 1;
    if (memory.createdAt >= startOfWeek) createdThisWeek += 1;
    if (memory.createdAt >= startOfMonth) createdThisMonth += 1;
    if (firstCaptureAt === null || memory.createdAt < firstCaptureAt) {
      firstCaptureAt = memory.createdAt;
    }
  }

  const { current, longest } = computeStreaks(daysWithCapture, now);

  return {
    total: active.length,
    inTrash: memories.filter(isDeleted).length,
    untagged: active.filter(isUntagged).length,
    createdToday,
    createdThisWeek,
    createdThisMonth,
    currentStreak: current,
    longestStreak: longest,
    activeDays: daysWithCapture.size,
    firstCaptureAt,
  };
}

/**
 * Number of memories per day — the calendar heatmap reads straight from this.
 */
export function countByDay(memories: readonly Memory[]): Map<IsoDate, number> {
  const counts = new Map<IsoDate, number>();

  for (const memory of memories) {
    if (!isActive(memory)) continue;
    const day = toIsoDate(memory.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return counts;
}

/**
 * Memories per day along the *event* axis — the dates their DateTags point at,
 * not when they were written.
 *
 * This is the correction the concept needs: an anecdote from 1995 typed today
 * would otherwise sit under today in the calendar, and "find that old memory"
 * quietly stops working. The date lookup is passed in so the domain stays
 * unaware of how date tags are stored.
 */
export function countByEventDay(
  memories: readonly Memory[],
  dateOf: (dateTagId: string) => IsoDate | undefined,
): Map<IsoDate, number> {
  const counts = new Map<IsoDate, number>();

  for (const memory of memories) {
    if (!isActive(memory)) continue;

    // A memory carrying several date tags counts once per distinct day.
    const days = new Set<IsoDate>();
    for (const dateTagId of memory.dateTagIds) {
      const day = dateOf(dateTagId);
      if (day !== undefined) days.add(day);
    }

    for (const day of days) {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }

  return counts;
}

/** Tag usage counts, replacing a denormalised counter on the Tag documents. */
export function countByTag(memories: readonly Memory[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const memory of memories) {
    if (!isActive(memory)) continue;
    for (const tagId of memory.tagIds) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }

  return counts;
}

export function countByDateTag(memories: readonly Memory[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const memory of memories) {
    if (!isActive(memory)) continue;
    for (const dateTagId of memory.dateTagIds) {
      counts.set(dateTagId, (counts.get(dateTagId) ?? 0) + 1);
    }
  }

  return counts;
}

function computeStreaks(
  daysWithCapture: ReadonlySet<IsoDate>,
  now: Date,
): { current: number; longest: number } {
  if (daysWithCapture.size === 0) return { current: 0, longest: 0 };

  const sorted = [...daysWithCapture].sort();
  let longest = 1;
  let run = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const day = sorted[index];
    if (previous === undefined || day === undefined) continue;

    run = isNextCalendarDay(previous, day) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return { current: currentStreak(daysWithCapture, now), longest };
}

/**
 * Counts back from today. A gap today does not break the streak — the user may
 * simply not have captured yet — but a gap yesterday does.
 */
function currentStreak(daysWithCapture: ReadonlySet<IsoDate>, now: Date): number {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!daysWithCapture.has(toIsoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daysWithCapture.has(toIsoDate(cursor))) return 0;
  }

  let streak = 0;
  while (daysWithCapture.has(toIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function isNextCalendarDay(previous: IsoDate, day: IsoDate): boolean {
  const [py, pm, pd] = previous.split('-').map(Number);
  const expected = new Date(py ?? 0, (pm ?? 1) - 1, (pd ?? 1) + 1);
  return toIsoDate(expected) === day;
}

/** Monday-based start of week, matching the French calendar convention. */
function startOfIsoWeek(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOfWeek);
  return start;
}
