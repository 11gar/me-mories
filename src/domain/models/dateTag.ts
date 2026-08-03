import { z } from 'zod';

import { createId } from '@/lib/id';
import { collapseWhitespace } from '@/lib/text';

import { asDateTagId, dateTagIdSchema } from './ids';
import { compareIsoDates, isoDateSchema } from './isoDate';
import type { IsoDate } from './isoDate';

export const DATE_TAG_LABEL_MAX_LENGTH = 80;

/**
 * A date that matters — a trip, a birth, a first day somewhere.
 *
 * The label is optional by design: capture must never stall on "what do I call
 * this?". Without one the UI falls back to the formatted date. But a bare date
 * is close to meaningless when re-read years later, which is why the field
 * exists at all.
 */
export const dateTagSchema = z.object({
  id: dateTagIdSchema,
  date: isoDateSchema,
  label: z.string().min(1).max(DATE_TAG_LABEL_MAX_LENGTH).nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DateTag = z.infer<typeof dateTagSchema>;

export interface DateTagDraft {
  date: IsoDate;
  label: string | null;
}

export const dateTagDraftSchema = z.object({
  date: isoDateSchema,
  label: z
    .string()
    .trim()
    .max(
      DATE_TAG_LABEL_MAX_LENGTH,
      `Le libellé ne peut pas dépasser ${DATE_TAG_LABEL_MAX_LENGTH} caractères.`,
    )
    .nullable()
    .default(null)
    // An empty label is the same thing as no label.
    .transform((value) => (value === null || value.length === 0 ? null : value)),
});

export function createDateTag(draft: DateTagDraft, now: Date = new Date()): DateTag {
  return {
    id: asDateTagId(createId()),
    date: draft.date,
    label: normalizeLabel(draft.label),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateDateTag(
  dateTag: DateTag,
  changes: Partial<DateTagDraft>,
  now: Date = new Date(),
): DateTag {
  return {
    ...dateTag,
    ...(changes.date === undefined ? {} : { date: changes.date }),
    ...(changes.label === undefined ? {} : { label: normalizeLabel(changes.label) }),
    updatedAt: now,
  };
}

function normalizeLabel(label: string | null): string | null {
  if (label === null) return null;
  const collapsed = collapseWhitespace(label);
  return collapsed.length === 0 ? null : collapsed;
}

/** Existing date tag for a given day, so the same day never gets two entries. */
export function findDateTagByDate(
  dateTags: readonly DateTag[],
  date: IsoDate,
): DateTag | undefined {
  return dateTags.find((dateTag) => dateTag.date === date);
}

export const byDateDescending = (a: DateTag, b: DateTag): number => compareIsoDates(b.date, a.date);

export const byDateAscending = (a: DateTag, b: DateTag): number => compareIsoDates(a.date, b.date);
