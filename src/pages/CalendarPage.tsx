import { useMemo, useState } from 'react';

import type { IsoDate } from '@/domain/models';
import { fromIsoDate, toIsoDate, todayIso } from '@/domain/models';
import { countByDay, countByEventDay } from '@/domain/services/stats';
import { MonthGrid } from '@/features/calendar/components/MonthGrid';
import { MemoryCard } from '@/features/memories/components/MemoryCard';
import { useMemoryActions } from '@/features/memories/hooks/useMemoryActions';
import { formatLongDate, formatWeekday } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useDateTagsStore, useMemoriesStore } from '@/store';
import { Button, EmptyState, Icon, Page } from '@/ui';

import styles from './CalendarPage.module.scss';

/**
 * Which date a memory is filed under.
 *
 * `created` is when it was written; `event` is the day its DateTags point at.
 * Both matter, and conflating them was the concept's sharpest flaw: an anecdote
 * from 1995 written today belongs to 1995 for the reader, and to today for the
 * archive.
 */
type Axis = 'created' | 'event';

const AXIS_LABELS: Record<Axis, string> = {
  created: 'Date de création',
  event: 'Date évoquée',
};

export function CalendarPage() {
  const memories = useMemoriesStore((state) => state.active);
  const dateTagsById = useDateTagsStore((state) => state.byId);
  const { edit, remove } = useMemoryActions();

  // The axis is derived, not stored: it defaults to the event date whenever
  // there is one to file by, and only sticks to a value once the user picks it.
  // A note written today about yesterday then lands on yesterday with no toggle.
  const [axisChoice, setAxisChoice] = useState<Axis | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<IsoDate>(() => todayIso());

  const dateOf = useMemo(
    () => (dateTagId: string) => dateTagsById[dateTagId]?.date,
    [dateTagsById],
  );

  const hasEventDates = useMemo(
    () => memories.some((memory) => memory.dateTagIds.length > 0),
    [memories],
  );

  const axis: Axis = axisChoice ?? (hasEventDates ? 'event' : 'created');

  const counts = useMemo(
    () => (axis === 'created' ? countByDay(memories) : countByEventDay(memories, dateOf)),
    [axis, memories, dateOf],
  );

  const dayMemories = useMemo(() => {
    if (axis === 'created') {
      return memories.filter((memory) => toIsoDate(memory.createdAt) === selected);
    }

    return memories.filter((memory) =>
      memory.dateTagIds.some((dateTagId) => dateOf(dateTagId) === selected),
    );
  }, [axis, memories, selected, dateOf]);

  const selectedDate = fromIsoDate(selected);

  return (
    <Page
      title="Calendrier"
      description="Naviguez dans vos mémoires jour par jour."
      width="wide"
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const today = new Date();
            setMonth(today);
            setSelected(toIsoDate(today));
          }}
        >
          Aujourd’hui
        </Button>
      }
    >
      {/* The axis switch only appears once there is something to switch to —
          before any date tag exists it would just be a dead control. */}
      {hasEventDates ? (
        <fieldset className={styles.axisToggle}>
          <legend className={styles.srOnly}>Axe du calendrier</legend>

          {(['created', 'event'] as const).map((value) => (
            <label
              key={value}
              className={cn(styles.axisButton, axis === value && styles.axisActive)}
            >
              <input
                type="radio"
                name="calendar-axis"
                value={value}
                checked={axis === value}
                onChange={() => setAxisChoice(value)}
                className={styles.srOnly}
              />
              {AXIS_LABELS[value]}
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className={styles.layout}>
        <MonthGrid
          month={month}
          onMonthChange={setMonth}
          counts={counts}
          selected={selected}
          onSelect={(day) => {
            setSelected(day);
            setMonth(fromIsoDate(day));
          }}
        />

        <section className={styles.dayPanel} aria-live="polite">
          <header className={styles.dayHeader}>
            <h2 className={styles.dayTitle}>
              <span className={styles.weekday}>{formatWeekday(selectedDate)}</span>
              {formatLongDate(selectedDate)}
            </h2>
            <span className={styles.dayCount}>
              {dayMemories.length} mémoire{dayMemories.length > 1 ? 's' : ''}
            </span>
          </header>

          {dayMemories.length === 0 ? (
            <EmptyState
              icon={<Icon name="calendar" size={20} />}
              title="Rien ce jour-là"
              description={
                axis === 'created'
                  ? 'Aucune mémoire n’a été écrite à cette date.'
                  : 'Aucune mémoire ne fait référence à cette date.'
              }
            />
          ) : (
            <div className={styles.dayList}>
              {dayMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={(target) => edit(target.id)}
                  onDelete={(target) => void remove(target.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
