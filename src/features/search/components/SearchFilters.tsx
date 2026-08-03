import { useMemo, useState } from 'react';

import type { DateTagId, TagId } from '@/domain/models';
import { asIsoDate, fromIsoDate, isIsoDate } from '@/domain/models';
import { countByDateTag, countByTag } from '@/domain/services/stats';
import {
  SORT_LABELS,
  SORT_ORDERS,
  countActiveFilters,
  hasActiveFilters,
} from '@/domain/services/searchQuery';
import type { SearchCriteria } from '@/domain/services/searchQuery';
import { formatLongDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useDateTagsStore, useMemoriesStore, useTagsStore } from '@/store';
import { Button, Icon, TagChip } from '@/ui';

import styles from './SearchFilters.module.scss';

export interface SearchFiltersProps {
  criteria: SearchCriteria;
  onChange: (patch: Partial<SearchCriteria>) => void;
  onReset: () => void;
  resultCount: number;
}

/** Date tags shown before the list is collapsed behind "show all". */
const VISIBLE_DATE_TAGS = 12;

export function SearchFilters({ criteria, onChange, onReset, resultCount }: SearchFiltersProps) {
  const tags = useTagsStore((state) => state.all);
  const dateTags = useDateTagsStore((state) => state.all);
  const memories = useMemoriesStore((state) => state.all);

  const [expanded, setExpanded] = useState(false);
  const [showAllDates, setShowAllDates] = useState(false);

  const tagCounts = useMemo(() => countByTag(memories), [memories]);
  const dateTagCounts = useMemo(() => countByDateTag(memories), [memories]);

  const activeCount = countActiveFilters(criteria);
  const anyFilter = hasActiveFilters(criteria);

  // Used tags first: a tag on forty memories is a far more likely filter than
  // one used once.
  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => (tagCounts.get(b.id) ?? 0) - (tagCounts.get(a.id) ?? 0)),
    [tags, tagCounts],
  );

  const visibleDateTags = showAllDates ? dateTags : dateTags.slice(0, VISIBLE_DATE_TAGS);

  function toggleTag(tagId: TagId) {
    onChange({
      tagIds: criteria.tagIds.includes(tagId)
        ? criteria.tagIds.filter((id) => id !== tagId)
        : [...criteria.tagIds, tagId],
    });
  }

  function toggleDateTag(dateTagId: DateTagId) {
    onChange({
      dateTagIds: criteria.dateTagIds.includes(dateTagId)
        ? criteria.dateTagIds.filter((id) => id !== dateTagId)
        : [...criteria.dateTagIds, dateTagId],
    });
  }

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <button
          type="button"
          className={cn(styles.toggle, expanded && styles.toggleOpen)}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="search-filters-panel"
        >
          <Icon name="filter" size={16} />
          Filtres
          {activeCount > 0 ? <span className={styles.badge}>{activeCount}</span> : null}
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={15} />
        </button>

        <label className={styles.sortField}>
          <span className={styles.srOnly}>Trier par</span>
          <select
            className={styles.sortSelect}
            value={criteria.sort}
            onChange={(event) => onChange({ sort: event.target.value as SearchCriteria['sort'] })}
          >
            {SORT_ORDERS.map((order) => (
              <option key={order} value={order}>
                {SORT_LABELS[order]}
              </option>
            ))}
          </select>
        </label>

        <span className={styles.count}>
          {resultCount} résultat{resultCount > 1 ? 's' : ''}
        </span>

        {anyFilter ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Réinitialiser
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className={styles.panel} id="search-filters-panel">
          {tags.length > 0 ? (
            <section className={styles.section}>
              <header className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Tags</h3>

                {criteria.tagIds.length > 1 || criteria.dateTagIds.length > 1 ? (
                  <div className={styles.matchToggle}>
                    <button
                      type="button"
                      className={
                        criteria.tagMatch === 'all' ? styles.matchActive : styles.matchButton
                      }
                      onClick={() => onChange({ tagMatch: 'all' })}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      className={
                        criteria.tagMatch === 'any' ? styles.matchActive : styles.matchButton
                      }
                      onClick={() => onChange({ tagMatch: 'any' })}
                    >
                      Au moins un
                    </button>
                  </div>
                ) : null}
              </header>

              <div className={styles.chips}>
                {sortedTags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    label={`${tag.title} · ${tagCounts.get(tag.id) ?? 0}`}
                    color={tag.color}
                    icon="tag"
                    size="sm"
                    selected={criteria.tagIds.includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {dateTags.length > 0 ? (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Dates</h3>

              <div className={styles.chips}>
                {visibleDateTags.map((dateTag) => (
                  <TagChip
                    key={dateTag.id}
                    label={`${dateTag.label ?? formatLongDate(fromIsoDate(dateTag.date))} · ${dateTagCounts.get(dateTag.id) ?? 0}`}
                    icon="calendar"
                    size="sm"
                    selected={criteria.dateTagIds.includes(dateTag.id)}
                    onClick={() => toggleDateTag(dateTag.id)}
                  />
                ))}

                {dateTags.length > VISIBLE_DATE_TAGS ? (
                  <button
                    type="button"
                    className={styles.more}
                    onClick={() => setShowAllDates((open) => !open)}
                  >
                    {showAllDates
                      ? 'Voir moins'
                      : `+ ${dateTags.length - VISIBLE_DATE_TAGS} autres`}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Période de création</h3>

            <div className={styles.dateRange}>
              <label className={styles.dateField}>
                <span>Du</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={criteria.createdFrom ?? ''}
                  max={criteria.createdTo ?? undefined}
                  onChange={(event) =>
                    onChange({
                      createdFrom: isIsoDate(event.target.value)
                        ? asIsoDate(event.target.value)
                        : null,
                    })
                  }
                />
              </label>

              <label className={styles.dateField}>
                <span>Au</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={criteria.createdTo ?? ''}
                  min={criteria.createdFrom ?? undefined}
                  onChange={(event) =>
                    onChange({
                      createdTo: isIsoDate(event.target.value)
                        ? asIsoDate(event.target.value)
                        : null,
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={criteria.untaggedOnly}
                onChange={(event) => onChange({ untaggedOnly: event.target.checked })}
              />
              <span>
                Uniquement les mémoires sans tag
                <span className={styles.checkboxHint}>
                  La pile à trier — c’est ce que le mode Relire fait décroître.
                </span>
              </span>
            </label>
          </section>
        </div>
      ) : null}
    </div>
  );
}
