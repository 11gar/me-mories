import type { MemoryId } from '../models/ids';
import { isActive } from '../models/memory';
import type { Memory } from '../models/memory';

/**
 * Picking what to resurface.
 *
 * A uniform random draw is the obvious implementation and the wrong one: it
 * repeats recently-seen memories, and leaves a long tail that is statistically
 * never shown. Since the point of the app is to work through the whole base
 * over time, the draw is weighted towards what has been neglected.
 *
 *   weight = (1 + days since last review) / (1 + reviewCount × penalty)
 *
 * Never reviewed counts as `NEVER_REVIEWED_DAYS` old, so fresh material leads.
 * The result stays random — nothing is forced — but the odds favour what the
 * user has not seen in a long time.
 */

const NEVER_REVIEWED_DAYS = 365;
const REVIEW_PENALTY = 1.5;
const MS_PER_DAY = 86_400_000;

export interface WeightedPickOptions {
  now?: Date;
  /** Injectable for deterministic tests. Must return [0, 1). */
  random?: () => number;
  /** Ids to keep out of the draw — typically the ones already on screen. */
  exclude?: ReadonlySet<MemoryId>;
}

export function reviewWeight(memory: Memory, now: Date): number {
  const daysSinceReview =
    memory.lastReviewedAt === null
      ? NEVER_REVIEWED_DAYS
      : Math.max(0, (now.getTime() - memory.lastReviewedAt.getTime()) / MS_PER_DAY);

  return (1 + daysSinceReview) / (1 + memory.reviewCount * REVIEW_PENALTY);
}

/**
 * Draws up to `count` distinct memories, weighted by neglect.
 *
 * Deleted memories are never drawn — the trash is not a review queue.
 */
export function pickWeightedRandom(
  memories: readonly Memory[],
  count: number,
  options: WeightedPickOptions = {},
): Memory[] {
  const now = options.now ?? new Date();
  const random = options.random ?? Math.random;
  const exclude = options.exclude;

  const pool = memories.filter((memory) => isActive(memory) && !(exclude?.has(memory.id) ?? false));

  const picked: Memory[] = [];
  const weights = new Map<MemoryId, number>(
    pool.map((memory) => [memory.id, reviewWeight(memory, now)]),
  );
  const remaining = [...pool];

  while (picked.length < count && remaining.length > 0) {
    const index = drawIndex(remaining, weights, random);
    const [chosen] = remaining.splice(index, 1);
    if (chosen === undefined) break;
    picked.push(chosen);
  }

  return picked;
}

function drawIndex(
  pool: readonly Memory[],
  weights: ReadonlyMap<MemoryId, number>,
  random: () => number,
): number {
  const total = pool.reduce((sum, memory) => sum + (weights.get(memory.id) ?? 0), 0);
  if (total <= 0) return Math.floor(random() * pool.length);

  let threshold = random() * total;

  for (let index = 0; index < pool.length; index += 1) {
    const memory = pool[index];
    if (memory === undefined) continue;

    threshold -= weights.get(memory.id) ?? 0;
    if (threshold <= 0) return index;
  }

  return pool.length - 1;
}

/**
 * Draws from memories created inside a window — the home page's "from the last
 * few days" and "from the last few months" shelves.
 */
export function pickRandomInWindow(
  memories: readonly Memory[],
  window: { from: Date; to: Date },
  count: number,
  options: WeightedPickOptions = {},
): Memory[] {
  const inWindow = memories.filter(
    (memory) => isActive(memory) && memory.createdAt >= window.from && memory.createdAt < window.to,
  );

  return pickWeightedRandom(inWindow, count, options);
}

/**
 * Memories created on this day in a previous year — the strongest rediscovery
 * hook there is.
 */
export function pickOnThisDay(memories: readonly Memory[], now: Date = new Date()): Memory[] {
  const month = now.getMonth();
  const day = now.getDate();
  const year = now.getFullYear();

  return memories
    .filter(
      (memory) =>
        isActive(memory) &&
        memory.createdAt.getMonth() === month &&
        memory.createdAt.getDate() === day &&
        memory.createdAt.getFullYear() < year,
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Ordering for swipe mode: most neglected first, with a random tie-break so two
 * sessions in a row do not present the same sequence.
 */
export function orderForReview(
  memories: readonly Memory[],
  options: WeightedPickOptions = {},
): Memory[] {
  return pickWeightedRandom(memories, memories.length, options);
}
