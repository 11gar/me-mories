import type { Todo } from '@/domain/models';
import type { TodoSection as TodoSectionModel } from '@/domain/services/todoOrganization';
import { Icon } from '@/ui';
import type { IconName } from '@/ui';

import { TodoGroup } from './TodoGroup';
import styles from './TodoSection.module.scss';

export interface TodoSectionProps {
  section: TodoSectionModel;
  title: string;
  icon: IconName;
  description?: string;
  /** Whether a given tag group inside this section is unfolded. */
  isOpen: (groupKey: string) => boolean;
  onOpenChange: (groupKey: string, open: boolean) => void;
  now: Date;
  onToggle: (todo: Todo) => void;
  onPostpone: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoSection({
  section,
  title,
  icon,
  description,
  isOpen,
  onOpenChange,
  now,
  onToggle,
  onPostpone,
  onEdit,
  onDelete,
}: TodoSectionProps) {
  // An empty section is noise. "Rien pour aujourd'hui" is worth saying once, on
  // the page, not three times down the column.
  if (section.todos.length === 0) return null;

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          <Icon name={icon} size={17} className={styles.icon} />
          {title}
          <span className={styles.count}>{section.remaining}</span>
        </h2>
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
      </header>

      <div className={styles.groups}>
        {section.groups.map((group) => {
          const groupKey = `${section.id}:${group.tagId ?? 'untagged'}`;

          return (
            <TodoGroup
              key={groupKey}
              tagId={group.tagId}
              todos={group.todos}
              remaining={group.remaining}
              now={now}
              open={isOpen(groupKey)}
              onOpenChange={(open) => onOpenChange(groupKey, open)}
              onToggle={onToggle}
              onPostpone={onPostpone}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </section>
  );
}
