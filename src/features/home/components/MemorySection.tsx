import type { ReactNode } from 'react';
import { Link } from 'react-router';

import type { Memory } from '@/domain/models';
import { MemoryCard } from '@/features/memories/components/MemoryCard';
import { Icon } from '@/ui';
import type { IconName } from '@/ui';

import styles from './MemorySection.module.scss';

export interface MemorySectionProps {
  title: string;
  icon: IconName;
  description?: string;
  memories: readonly Memory[];
  onEdit: (memory: Memory) => void;
  onDelete: (memory: Memory) => void;
  action?: ReactNode;
  seeAllTo?: string;
}

export function MemorySection({
  title,
  icon,
  description,
  memories,
  onEdit,
  onDelete,
  action,
  seeAllTo,
}: MemorySectionProps) {
  // A section with nothing in it is noise on a home page whose job is to invite
  // reading — it simply does not render.
  if (memories.length === 0) return null;

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>
            <Icon name={icon} size={17} className={styles.icon} />
            {title}
          </h2>
          {description === undefined ? null : <p className={styles.description}>{description}</p>}
        </div>

        <div className={styles.actions}>
          {action}
          {seeAllTo === undefined ? null : (
            <Link to={seeAllTo} className={styles.seeAll}>
              Tout voir
              <Icon name="chevronRight" size={15} />
            </Link>
          )}
        </div>
      </header>

      <div className={styles.list}>
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
