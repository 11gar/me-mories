import { z } from 'zod';

import { createId } from '@/lib/id';
import { collapseWhitespace, normalizeText } from '@/lib/text';

import { asTagId, tagIdSchema } from './ids';

export const TAG_TITLE_MAX_LENGTH = 60;

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'La couleur doit être un hexadécimal à 6 chiffres, ex. #5b53e8.');

export const tagSchema = z.object({
  id: tagIdSchema,
  title: z.string().min(1).max(TAG_TITLE_MAX_LENGTH),
  /**
   * Lower-cased, accent-free form of the title. Stored rather than derived so
   * that duplicate detection and sorting never depend on where the comparison
   * happens to run.
   */
  titleNormalized: z.string().min(1).max(TAG_TITLE_MAX_LENGTH),
  color: hexColorSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Tag = z.infer<typeof tagSchema>;

export interface TagDraft {
  title: string;
  color: string;
}

export const tagDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Le nom du tag ne peut pas être vide.')
    .max(
      TAG_TITLE_MAX_LENGTH,
      `Le nom du tag ne peut pas dépasser ${TAG_TITLE_MAX_LENGTH} caractères.`,
    ),
  color: hexColorSchema,
});

export function createTag(draft: TagDraft, now: Date = new Date()): Tag {
  const title = collapseWhitespace(draft.title);
  return {
    id: asTagId(createId()),
    title,
    titleNormalized: normalizeText(title),
    color: draft.color,
    createdAt: now,
    updatedAt: now,
  };
}

export function renameTag(tag: Tag, title: string, now: Date = new Date()): Tag {
  const nextTitle = collapseWhitespace(title);
  return { ...tag, title: nextTitle, titleNormalized: normalizeText(nextTitle), updatedAt: now };
}

export function recolorTag(tag: Tag, color: string, now: Date = new Date()): Tag {
  return { ...tag, color, updatedAt: now };
}

/**
 * Finds an existing tag matching a free-text title, ignoring case and accents.
 *
 * This is the single defence against tag sprawl: fast capture means the same
 * idea gets typed "Café", "cafe" and "CAFÉ", and each spelling would otherwise
 * become its own tag.
 */
export function findTagByTitle(tags: readonly Tag[], title: string): Tag | undefined {
  const normalized = normalizeText(title);
  if (normalized.length === 0) return undefined;
  return tags.find((tag) => tag.titleNormalized === normalized);
}

export const byTitle = (a: Tag, b: Tag): number =>
  a.titleNormalized.localeCompare(b.titleNormalized, 'fr');
