import { addDays } from 'date-fns';

import type { TagId, Todo } from '@/domain/models';
import {
  describeRecurrence,
  fromIsoDate,
  isSeries,
  isTodoOverdue,
  overdueDays,
  toIsoDate,
} from '@/domain/models';
import type { IsoDate } from '@/domain/models';
import { cn } from '@/lib/cn';
import { formatLongDate } from '@/lib/date';
import { resolveTags, useTagsStore } from '@/store';
import { Icon, IconButton, TagChip } from '@/ui';

import styles from './TodoItem.module.scss';

export interface TodoItemProps {
  todo: Todo;
  /** Today, passed in so a list of rows agrees on what "overdue" means. */
  now: Date;
  /** The group's own tag, omitted from the chips to avoid repeating it. */
  hideTagId?: TagId | null;
  onToggle: (todo: Todo) => void;
  onPostpone: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoItem({
  todo,
  now,
  hideTagId,
  onToggle,
  onPostpone,
  onEdit,
  onDelete,
}: TodoItemProps) {
  const tagsById = useTagsStore((state) => state.byId);

  const tags = resolveTags(todo.tagIds, tagsById).filter((tag) => tag.id !== hideTagId);
  const done = todo.status === 'done';
  const postponed = todo.status === 'postponed';
  const overdue = isTodoOverdue(todo, now);
  const late = overdueDays(todo, now);

  return (
    <li className={cn(styles.item, done && styles.done, postponed && styles.postponed)}>
      {/* A postponement record is history, not work: it carries no checkbox,
          because ticking a day that was explicitly pushed away is meaningless. */}
      {postponed ? (
        <span className={styles.trace} aria-hidden="true">
          <Icon name="clock" size={15} />
        </span>
      ) : (
        <label className={styles.check}>
          <input
            type="checkbox"
            className={styles.checkInput}
            checked={done}
            onChange={() => onToggle(todo)}
            aria-label={done ? `Rouvrir : ${todo.title}` : `Terminer : ${todo.title}`}
          />
          <span className={styles.box} aria-hidden="true">
            <Icon name="check" size={13} />
          </span>
        </label>
      )}

      <div className={styles.body}>
        <button type="button" className={styles.title} onClick={() => onEdit(todo)}>
          {todo.title}
        </button>

        <p className={styles.meta}>
          {todo.dueDate === null ? null : (
            <span className={cn(styles.due, overdue && styles.overdue)}>
              {overdue ? `en retard de ${late} j` : formatDueLabel(todo.dueDate, now)}
            </span>
          )}

          {isSeries(todo) && todo.recurrence !== null ? (
            <span className={styles.recurrence}>
              <Icon name="repeat" size={12} />
              {describeRecurrence(todo.recurrence)}
            </span>
          ) : null}

          {postponed ? <span className={styles.tracelabel}>reporté</span> : null}

          {todo.postponeCount > 0 && !postponed ? (
            <span className={styles.postponeCount}>reporté {todo.postponeCount} fois</span>
          ) : null}
        </p>

        {tags.length > 0 ? (
          <div className={styles.chips}>
            {tags.map((tag) => (
              <TagChip key={tag.id} label={tag.title} color={tag.color} icon="tag" size="sm" />
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        {todo.dueDate !== null && todo.status === 'todo' ? (
          <IconButton
            label={`Remettre à demain : ${todo.title}`}
            icon={<Icon name="clock" size={16} />}
            size="sm"
            onClick={() => onPostpone(todo)}
          />
        ) : null}

        <IconButton
          label={`Modifier : ${todo.title}`}
          icon={<Icon name="edit" size={16} />}
          size="sm"
          onClick={() => onEdit(todo)}
        />

        <IconButton
          label={`Supprimer : ${todo.title}`}
          icon={<Icon name="trash" size={16} />}
          size="sm"
          onClick={() => onDelete(todo)}
        />
      </div>
    </li>
  );
}

/**
 * "aujourd'hui" / "demain" / "12 mars" — never a bare date for the two days
 * that matter, because reading a date and working out that it is today is
 * exactly the work a task list should be doing for you.
 */
function formatDueLabel(dueDate: IsoDate, now: Date): string {
  if (dueDate === toIsoDate(now)) return "aujourd'hui";
  if (dueDate === toIsoDate(addDays(now, 1))) return 'demain';
  return formatLongDate(fromIsoDate(dueDate));
}
