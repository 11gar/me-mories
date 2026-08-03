import { useMemo, useState } from 'react';

import type { Tag, TagId } from '@/domain/models';
import { findTagByTitle } from '@/domain/models';
import { normalizeText } from '@/lib/text';
import { useTagsStore } from '@/store';
import { Icon, TagChip } from '@/ui';

import styles from './TagPickerPanel.module.scss';

export interface TagPickerPanelProps {
  selectedIds: readonly TagId[];
  onToggle: (tag: Tag) => void;
  onCreate: (title: string) => void;
}

/**
 * Inline tag picker: filter, toggle, or create on the spot.
 *
 * Inline rather than a floating popover — no positioning maths, and it behaves
 * identically inside a bottom sheet on mobile, which is where capture actually
 * happens most.
 */
export function TagPickerPanel({ selectedIds, onToggle, onCreate }: TagPickerPanelProps) {
  const tags = useTagsStore((state) => state.all);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = normalizeText(query);
    if (needle.length === 0) return tags;
    return tags.filter((tag) => tag.titleNormalized.includes(needle));
  }, [tags, query]);

  const trimmed = query.trim();
  const canCreate = trimmed.length > 0 && findTagByTitle(tags, trimmed) === undefined;

  return (
    <div className={styles.panel}>
      <div className={styles.searchRow}>
        <Icon name="search" size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.search}
          placeholder="Filtrer ou créer un tag…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();

            if (canCreate) {
              onCreate(trimmed);
              setQuery('');
              return;
            }

            const [first] = filtered;
            if (first !== undefined) {
              onToggle(first);
              setQuery('');
            }
          }}
        />
      </div>

      <div className={styles.list}>
        {canCreate ? (
          <button
            type="button"
            className={styles.create}
            onClick={() => {
              onCreate(trimmed);
              setQuery('');
            }}
          >
            <Icon name="plus" size={14} />
            Créer «&nbsp;{trimmed}&nbsp;»
          </button>
        ) : null}

        {filtered.map((tag) => (
          <TagChip
            key={tag.id}
            label={tag.title}
            color={tag.color}
            icon="tag"
            size="sm"
            selected={selectedIds.includes(tag.id)}
            onClick={() => onToggle(tag)}
          />
        ))}

        {filtered.length === 0 && !canCreate ? (
          <p className={styles.empty}>Aucun tag pour l’instant.</p>
        ) : null}
      </div>
    </div>
  );
}
