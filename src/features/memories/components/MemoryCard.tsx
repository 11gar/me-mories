import { Link } from 'react-router';

import { memoryPath } from '@/app/router/paths';
import type { Memory } from '@/domain/models';
import { fromIsoDate } from '@/domain/models';
import { formatLongDate, formatRelative, toDateTimeAttribute } from '@/lib/date';
import { cn } from '@/lib/cn';
import { resolveDateTags, resolveTags, useDateTagsStore, useTagsStore } from '@/store';
import { HighlightedText, Icon, IconButton, TagChip } from '@/ui';

import styles from './MemoryCard.module.scss';

export interface MemoryCardProps {
  memory: Memory;
  onEdit?: (memory: Memory) => void;
  onDelete?: (memory: Memory) => void;
  onRestore?: (memory: Memory) => void;
  /** Truncates long memories in list views; full text on the detail page. */
  clamp?: boolean;
  /** Search query whose terms get marked in the text. */
  highlight?: string;
  className?: string;
}

export function MemoryCard({
  memory,
  onEdit,
  onDelete,
  onRestore,
  clamp = true,
  highlight,
  className,
}: MemoryCardProps) {
  const tagsById = useTagsStore((state) => state.byId);
  const dateTagsById = useDateTagsStore((state) => state.byId);

  const tags = resolveTags(memory.tagIds, tagsById);
  const dateTags = resolveDateTags(memory.dateTagIds, dateTagsById);
  const inTrash = memory.deletedAt !== null;

  return (
    <article className={cn(styles.card, inTrash && styles.trashed, className)}>
      <div className={styles.main}>
        <p className={cn(styles.text, clamp && styles.clamped)}>
          <HighlightedText text={memory.text} query={highlight} />
        </p>

        {tags.length > 0 || dateTags.length > 0 ? (
          <div className={styles.chips}>
            {tags.map((tag) => (
              <TagChip key={tag.id} label={tag.title} color={tag.color} icon="tag" size="sm" />
            ))}
            {dateTags.map((dateTag) => (
              <TagChip
                key={dateTag.id}
                label={dateTag.label ?? formatLongDate(fromIsoDate(dateTag.date))}
                icon="calendar"
                size="sm"
              />
            ))}
          </div>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <time className={styles.date} dateTime={toDateTimeAttribute(memory.createdAt)}>
          {formatRelative(memory.createdAt)}
        </time>

        <div className={styles.actions}>
          {onRestore === undefined ? null : (
            <IconButton
              label="Restaurer"
              icon={<Icon name="restore" size={16} />}
              size="sm"
              onClick={() => onRestore(memory)}
            />
          )}

          {onEdit === undefined ? null : (
            <IconButton
              label="Modifier"
              icon={<Icon name="edit" size={16} />}
              size="sm"
              onClick={() => onEdit(memory)}
            />
          )}

          {onDelete === undefined ? null : (
            <IconButton
              label="Supprimer"
              icon={<Icon name="trash" size={16} />}
              size="sm"
              variant="danger"
              onClick={() => onDelete(memory)}
            />
          )}

          <Link to={memoryPath(memory.id)} className={styles.open} aria-label="Ouvrir la mémoire">
            <Icon name="chevronRight" size={16} />
          </Link>
        </div>
      </footer>
    </article>
  );
}
