import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';

import type { IsoDate } from '@/domain/models';
import { toIsoDate } from '@/domain/models';
import { cn } from '@/lib/cn';
import { formatLongDate, formatMonthYear } from '@/lib/date';
import { Icon, IconButton } from '@/ui';

import styles from './MonthGrid.module.scss';

export interface MonthGridProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  counts: ReadonlyMap<IsoDate, number>;
  selected: IsoDate | null;
  onSelect: (day: IsoDate) => void;
}

/** Density buckets for the heatmap. Four levels read clearly; more is noise. */
function densityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (max <= 1) return 4;

  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const WEEKDAYS = [
  { short: 'lun.', full: 'lundi' },
  { short: 'mar.', full: 'mardi' },
  { short: 'mer.', full: 'mercredi' },
  { short: 'jeu.', full: 'jeudi' },
  { short: 'ven.', full: 'vendredi' },
  { short: 'sam.', full: 'samedi' },
  { short: 'dim.', full: 'dimanche' },
];

function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

/**
 * A month as a real `<table>`.
 *
 * A calendar is tabular data, and the markup should say so: with `<th scope>`
 * headers a screen reader announces "mercredi 12" when moving across a row,
 * which a grid of divs cannot do.
 */
export function MonthGrid({ month, onMonthChange, counts, selected, onSelect }: MonthGridProps) {
  // Weeks start on Monday: this is a French app, and an off-by-one weekday
  // makes a calendar unreadable.
  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1, locale: fr });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1, locale: fr });
    return chunkIntoWeeks(eachDayOfInterval({ start, end }));
  }, [month]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const week of weeks) {
      for (const day of week) {
        const count = counts.get(toIsoDate(day)) ?? 0;
        if (count > max) max = count;
      }
    }
    return max;
  }, [weeks, counts]);

  const monthLabel = formatMonthYear(month);

  return (
    <div className={styles.calendar}>
      <header className={styles.header}>
        <IconButton
          label="Mois précédent"
          icon={<Icon name="chevronLeft" size={18} />}
          size="sm"
          onClick={() => onMonthChange(addMonths(month, -1))}
        />

        <h2 className={styles.monthLabel}>{monthLabel}</h2>

        <IconButton
          label="Mois suivant"
          icon={<Icon name="chevronRight" size={18} />}
          size="sm"
          onClick={() => onMonthChange(addMonths(month, 1))}
        />
      </header>

      <table className={styles.table}>
        <caption className={styles.srOnly}>Calendrier de {monthLabel}</caption>

        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday.short} scope="col" className={styles.weekday}>
                <abbr title={weekday.full}>{weekday.short}</abbr>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {weeks.map((week) => (
            <tr key={toIsoDate(week[0] ?? month)}>
              {week.map((day) => {
                const iso = toIsoDate(day);
                const count = counts.get(iso) ?? 0;
                const outside = !isSameMonth(day, month);
                const isSelected = selected === iso;

                return (
                  <td key={iso} className={styles.cell}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${formatLongDate(day)} — ${count} mémoire${count > 1 ? 's' : ''}`}
                      className={cn(
                        styles.day,
                        outside && styles.outside,
                        isToday(day) && styles.today,
                        isSelected && styles.selected,
                        styles[`level${densityLevel(count, maxCount)}`],
                      )}
                      onClick={() => onSelect(iso)}
                    >
                      <span className={styles.dayNumber}>{day.getDate()}</span>
                      {count > 0 ? <span className={styles.dot} aria-hidden="true" /> : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
