import type { TagId, Todo } from '@/domain/models';
import { useTagsStore } from '@/store';
import { Accordion, Icon, TagChip } from '@/ui';

import { TodoItem } from './TodoItem';
import styles from './TodoGroup.module.scss';

export interface TodoGroupProps {
  /** `null` renders the "Sans tag" group. */
  tagId: TagId | null;
  todos: readonly Todo[];
  /** Items still to do — what the header counts. */
  remaining: number;
  now: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (todo: Todo) => void;
  onPostpone: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

/**
 * One tag's worth of todos, folded into an accordion.
 *
 * The header counts what is left rather than the total: on a list you are
 * working through, "2" meaning "two still to do" is the number you want, and it
 * reaches zero as you tick things off — which is the entire feedback loop.
 */
export function TodoGroup({
  tagId,
  todos,
  remaining,
  now,
  open,
  onOpenChange,
  onToggle,
  onPostpone,
  onEdit,
  onDelete,
}: TodoGroupProps) {
  const tagsById = useTagsStore((state) => state.byId);
  const tag = tagId === null ? undefined : tagsById[tagId];

  const title =
    tag === undefined ? (
      <span className={styles.untagged}>
        <Icon name="inbox" size={15} />
        Sans tag
      </span>
    ) : (
      <TagChip label={tag.title} color={tag.color} icon="tag" size="sm" />
    );

  return (
    <Accordion
      title={title}
      meta={remaining === 0 ? 'terminé' : `${remaining} à faire`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ul className={styles.list} role="list">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            now={now}
            hideTagId={tagId}
            onToggle={onToggle}
            onPostpone={onPostpone}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </Accordion>
  );
}
