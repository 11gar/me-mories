import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { searchPath } from '@/app/router/paths';
import type { DateTag } from '@/domain/models';
import { fromIsoDate } from '@/domain/models';
import { criteriaToSearchParams, emptySearchCriteria } from '@/domain/services/searchQuery';
import { countByDateTag } from '@/domain/services/stats';
import { DateTagEditorModal } from '@/features/date-tags/components/DateTagEditorModal';
import { formatLongDate } from '@/lib/date';
import { useDateTagsStore, useMemoriesStore } from '@/store';
import { EmptyState, Icon, IconButton, Page } from '@/ui';

import styles from './DateTagsPage.module.scss';

export function DateTagsPage() {
  const dateTags = useDateTagsStore((state) => state.all);
  const memories = useMemoriesStore((state) => state.all);
  const navigate = useNavigate();

  const [editing, setEditing] = useState<DateTag | null>(null);

  const counts = useMemo(() => countByDateTag(memories), [memories]);

  // Grouped by year: date tags accumulate over a lifetime, and a flat list of
  // two hundred dates is unusable.
  const byYear = useMemo(() => {
    const groups = new Map<string, DateTag[]>();

    for (const dateTag of dateTags) {
      const year = dateTag.date.slice(0, 4);
      groups.set(year, [...(groups.get(year) ?? []), dateTag]);
    }

    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [dateTags]);

  function browseDateTag(dateTag: DateTag) {
    void navigate(
      searchPath(criteriaToSearchParams({ ...emptySearchCriteria, dateTagIds: [dateTag.id] })),
    );
  }

  return (
    <Page
      title="Dates"
      description={`${dateTags.length} date${dateTags.length > 1 ? 's' : ''} importante${dateTags.length > 1 ? 's' : ''}.`}
      width="wide"
    >
      {dateTags.length === 0 ? (
        <EmptyState
          icon={<Icon name="calendar" size={22} />}
          title="Aucune date enregistrée"
          description="Écrivez @2024-03-12 ou @hier pendant la saisie : la date est reconnue et créée automatiquement."
        />
      ) : (
        <div className={styles.years}>
          {byYear.map(([year, group]) => (
            <section key={year}>
              <h2 className={styles.year}>{year}</h2>

              <ul className={styles.list} role="list">
                {group.map((dateTag) => {
                  const count = counts.get(dateTag.id) ?? 0;

                  return (
                    <li key={dateTag.id} className={styles.row}>
                      <button
                        type="button"
                        className={styles.dateButton}
                        onClick={() => browseDateTag(dateTag)}
                      >
                        <Icon name="calendar" size={16} className={styles.icon} />
                        <span className={styles.label}>
                          {dateTag.label ?? formatLongDate(fromIsoDate(dateTag.date))}
                        </span>
                        {dateTag.label === null ? null : (
                          <span className={styles.rawDate}>
                            {formatLongDate(fromIsoDate(dateTag.date))}
                          </span>
                        )}
                      </button>

                      <span className={count === 0 ? styles.countZero : styles.count}>
                        {count === 0 ? 'inutilisée' : `${count} mémoire${count > 1 ? 's' : ''}`}
                      </span>

                      <IconButton
                        label={`Modifier ${dateTag.label ?? dateTag.date}`}
                        icon={<Icon name="edit" size={16} />}
                        size="sm"
                        onClick={() => setEditing(dateTag)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <DateTagEditorModal
        dateTag={editing}
        usageCount={editing === null ? 0 : (counts.get(editing.id) ?? 0)}
        onClose={() => setEditing(null)}
      />
    </Page>
  );
}
