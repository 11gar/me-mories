import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { searchPath } from '@/app/router/paths';
import type { Tag } from '@/domain/models';
import { criteriaToSearchParams, emptySearchCriteria } from '@/domain/services/searchQuery';
import { countByTag } from '@/domain/services/stats';
import { TagEditorModal } from '@/features/tags/components/TagEditorModal';
import { useMemoriesStore, useTagsStore } from '@/store';
import { EmptyState, Icon, IconButton, Page, TagChip } from '@/ui';

import styles from './TagsPage.module.scss';

type SortMode = 'usage' | 'alpha';

export function TagsPage() {
  const tags = useTagsStore((state) => state.all);
  const memories = useMemoriesStore((state) => state.all);
  const navigate = useNavigate();

  const [sort, setSort] = useState<SortMode>('usage');
  const [editing, setEditing] = useState<Tag | null>(null);

  // Counts are computed rather than denormalised onto the tag documents: with
  // every memory already in memory it is one pass, and there is no counter to
  // drift out of sync.
  const counts = useMemo(() => countByTag(memories), [memories]);

  const sorted = useMemo(() => {
    if (sort === 'alpha') return tags;
    return [...tags].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  }, [tags, counts, sort]);

  const unused = sorted.filter((tag) => (counts.get(tag.id) ?? 0) === 0);

  function browseTag(tag: Tag) {
    void navigate(searchPath(criteriaToSearchParams({ ...emptySearchCriteria, tagIds: [tag.id] })));
  }

  return (
    <Page
      title="Tags"
      description={`${tags.length} tag${tags.length > 1 ? 's' : ''}${unused.length > 0 ? ` · ${unused.length} inutilisé${unused.length > 1 ? 's' : ''}` : ''}`}
      width="wide"
      actions={
        tags.length > 1 ? (
          <div className={styles.sortToggle}>
            <button
              type="button"
              className={sort === 'usage' ? styles.sortActive : styles.sortButton}
              onClick={() => setSort('usage')}
            >
              Usage
            </button>
            <button
              type="button"
              className={sort === 'alpha' ? styles.sortActive : styles.sortButton}
              onClick={() => setSort('alpha')}
            >
              A→Z
            </button>
          </div>
        ) : undefined
      }
    >
      {tags.length === 0 ? (
        <EmptyState
          icon={<Icon name="tag" size={22} />}
          title="Aucun tag pour l’instant"
          description="Écrivez #untag pendant la saisie d’une mémoire : le tag est créé automatiquement."
        />
      ) : (
        <ul className={styles.list} role="list">
          {sorted.map((tag) => {
            const count = counts.get(tag.id) ?? 0;

            return (
              <li key={tag.id} className={styles.row}>
                <TagChip
                  label={tag.title}
                  color={tag.color}
                  icon="tag"
                  onClick={() => browseTag(tag)}
                />

                <span className={count === 0 ? styles.countZero : styles.count}>
                  {count === 0 ? 'inutilisé' : `${count} mémoire${count > 1 ? 's' : ''}`}
                </span>

                <IconButton
                  label={`Modifier ${tag.title}`}
                  icon={<Icon name="edit" size={16} />}
                  size="sm"
                  onClick={() => setEditing(tag)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <TagEditorModal
        tag={editing}
        usageCount={editing === null ? 0 : (counts.get(editing.id) ?? 0)}
        onClose={() => setEditing(null)}
      />
    </Page>
  );
}
