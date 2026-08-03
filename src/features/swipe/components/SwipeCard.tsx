import { motion, useMotionValue, useTransform } from 'motion/react';
import type { PanInfo } from 'motion/react';

import type { DateTag, Memory, Tag } from '@/domain/models';
import { fromIsoDate } from '@/domain/models';
import { formatLongDate, formatRelative, toDateTimeAttribute } from '@/lib/date';
import { Icon, TagChip } from '@/ui';

import styles from './SwipeCard.module.scss';

export interface SwipeCardProps {
  memory: Memory;
  tags: readonly Tag[];
  dateTags: readonly DateTag[];
  onDismiss: () => void;
  onRemoveTag: (tag: Tag) => void;
  onRemoveDateTag: (dateTag: DateTag) => void;
}

/** Past this horizontal distance, releasing moves on to the next memory. */
const DISMISS_DISTANCE = 120;
/** …or past this flick speed, however short the drag. */
const DISMISS_VELOCITY = 500;

export function SwipeCard({
  memory,
  tags,
  dateTags,
  onDismiss,
  onRemoveTag,
  onRemoveDateTag,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-8, 0, 8]);
  const opacity = useTransform(x, [-300, -140, 0, 140, 300], [0, 1, 1, 1, 0]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (
      Math.abs(info.offset.x) > DISMISS_DISTANCE ||
      Math.abs(info.velocity.x) > DISMISS_VELOCITY
    ) {
      onDismiss();
    }
  }

  return (
    <motion.article
      className={styles.card}
      style={{ x, rotate, opacity }}
      drag="x"
      // Snaps back to centre unless the gesture passes the threshold — both
      // directions mean "next". Swiping never deletes: on a knowledge base that
      // gesture is far too easy to trigger by accident.
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <p className={styles.text}>{memory.text}</p>

      {tags.length > 0 || dateTags.length > 0 ? (
        <div className={styles.chips}>
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              label={tag.title}
              color={tag.color}
              icon="tag"
              size="sm"
              onRemove={() => onRemoveTag(tag)}
            />
          ))}
          {dateTags.map((dateTag) => (
            <TagChip
              key={dateTag.id}
              label={dateTag.label ?? formatLongDate(fromIsoDate(dateTag.date))}
              icon="calendar"
              size="sm"
              onRemove={() => onRemoveDateTag(dateTag)}
            />
          ))}
        </div>
      ) : (
        <p className={styles.untagged}>
          <Icon name="sparkles" size={14} />
          Aucun tag — c’est le moment d’en ajouter un.
        </p>
      )}

      <footer className={styles.footer}>
        <time dateTime={toDateTimeAttribute(memory.createdAt)}>
          Notée {formatRelative(memory.createdAt)}
        </time>
        {memory.reviewCount > 0 ? <span>· relue {memory.reviewCount} fois</span> : null}
      </footer>
    </motion.article>
  );
}
