import type { DateTag, Memory, Tag } from '../models';

/**
 * Data export.
 *
 * Not a nice-to-have: this app asks people to entrust it with things they want
 * to keep for decades. Being able to walk away with everything, in a format
 * that outlives the app, is the difference between a notebook and a hostage
 * situation.
 *
 * Both formats are produced by pure functions so they are testable and cannot
 * accidentally depend on what is on screen.
 */

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportInput {
  memories: readonly Memory[];
  tags: readonly Tag[];
  dateTags: readonly DateTag[];
  exportedAt?: Date;
}

/** Complete, re-importable dump. Dates are ISO 8601. */
export function toJsonExport({
  memories,
  tags,
  dateTags,
  exportedAt = new Date(),
}: ExportInput): string {
  return JSON.stringify(
    {
      application: "Me'Mories",
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: exportedAt.toISOString(),
      tags: tags.map((tag) => ({
        id: tag.id,
        title: tag.title,
        color: tag.color,
        createdAt: tag.createdAt.toISOString(),
      })),
      dateTags: dateTags.map((dateTag) => ({
        id: dateTag.id,
        date: dateTag.date,
        label: dateTag.label,
        createdAt: dateTag.createdAt.toISOString(),
      })),
      memories: memories.map((memory) => ({
        id: memory.id,
        text: memory.text,
        createdAt: memory.createdAt.toISOString(),
        updatedAt: memory.updatedAt.toISOString(),
        tagIds: memory.tagIds,
        dateTagIds: memory.dateTagIds,
        deletedAt: memory.deletedAt?.toISOString() ?? null,
        reviewCount: memory.reviewCount,
      })),
    },
    null,
    2,
  );
}

/**
 * Human-readable archive, grouped by month.
 *
 * Ids are resolved to names here — a Markdown file full of UUIDs would be
 * useless to the person reading it in ten years.
 */
export function toMarkdownExport({
  memories,
  tags,
  dateTags,
  exportedAt = new Date(),
}: ExportInput): string {
  const tagTitles = new Map(tags.map((tag) => [tag.id as string, tag.title]));
  const dateLabels = new Map(
    dateTags.map((dateTag) => [
      dateTag.id as string,
      dateTag.label === null ? dateTag.date : `${dateTag.label} (${dateTag.date})`,
    ]),
  );

  const sorted = [...memories].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const lines: string[] = [
    "# Me'Mories",
    '',
    `Export du ${formatIsoDay(exportedAt)} — ${memories.length} mémoire${memories.length > 1 ? 's' : ''}.`,
    '',
  ];

  let currentMonth = '';

  for (const memory of sorted) {
    const month = `${memory.createdAt.getFullYear()}-${String(memory.createdAt.getMonth() + 1).padStart(2, '0')}`;

    if (month !== currentMonth) {
      currentMonth = month;
      lines.push(`## ${month}`, '');
    }

    lines.push(`### ${formatIsoDay(memory.createdAt)}`, '');
    lines.push(memory.text, '');

    const labels = [
      ...memory.tagIds
        .map((id) => tagTitles.get(id))
        .filter(isDefined)
        .map((t) => `#${t}`),
      ...memory.dateTagIds
        .map((id) => dateLabels.get(id))
        .filter(isDefined)
        .map((d) => `@${d}`),
    ];

    if (labels.length > 0) lines.push(`*${labels.join(' · ')}*`, '');
  }

  return lines.join('\n');
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function formatIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function exportFilename(extension: 'json' | 'md', exportedAt = new Date()): string {
  return `me-mories-${formatIsoDay(exportedAt)}.${extension}`;
}
