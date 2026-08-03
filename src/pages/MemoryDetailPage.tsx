import { Link, useNavigate, useParams } from 'react-router';

import { ROUTES } from '@/app/router/paths';
import { fromIsoDate } from '@/domain/models';
import { MemoryCard } from '@/features/memories/components/MemoryCard';
import { useMemoryActions } from '@/features/memories/hooks/useMemoryActions';
import { formatDateTime, formatLongDate } from '@/lib/date';
import {
  resolveDateTags,
  resolveTags,
  useDateTagsStore,
  useMemoriesStore,
  useSessionStore,
  useTagsStore,
} from '@/store';
import { Button, EmptyState, Icon, Page, Spinner, TagChip } from '@/ui';

import styles from './MemoryDetailPage.module.scss';

/** How many related memories to surface. Enough to be useful, few enough to
 * stay a suggestion rather than a second list. */
const RELATED_LIMIT = 4;

export function MemoryDetailPage() {
  const { memoryId } = useParams();
  const navigate = useNavigate();

  const loaded = useMemoriesStore((state) => state.loaded);
  const status = useSessionStore((state) => state.status);
  const byId = useMemoriesStore((state) => state.byId);
  const active = useMemoriesStore((state) => state.active);
  const tagsById = useTagsStore((state) => state.byId);
  const dateTagsById = useDateTagsStore((state) => state.byId);
  const { edit, remove, restore } = useMemoryActions();

  const memory = memoryId === undefined ? undefined : byId[memoryId];

  if (!loaded && status !== 'ready') {
    return (
      <Page title="Mémoire">
        <div className={styles.loading}>
          <Spinner size={24} label="Chargement" />
        </div>
      </Page>
    );
  }

  if (memory === undefined) {
    return (
      <Page title="Mémoire">
        <EmptyState
          icon={<Icon name="search" size={22} />}
          title="Cette mémoire n’existe plus"
          description="Elle a peut-être été supprimée définitivement."
          action={
            <Link to={ROUTES.memories}>
              <Button variant="primary">Retour aux mémoires</Button>
            </Link>
          }
        />
      </Page>
    );
  }

  const tags = resolveTags(memory.tagIds, tagsById);
  const dateTags = resolveDateTags(memory.dateTagIds, dateTagsById);
  const inTrash = memory.deletedAt !== null;

  // Related by shared tags — a cheap, explainable heuristic. Semantic
  // similarity via embeddings is the planned upgrade, and slots in here.
  const related =
    memory.tagIds.length === 0
      ? []
      : active
          .filter(
            (candidate) =>
              candidate.id !== memory.id &&
              candidate.tagIds.some((tagId) => memory.tagIds.includes(tagId)),
          )
          .slice(0, RELATED_LIMIT);

  return (
    <Page
      title="Mémoire"
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate(-1)}
            iconLeft={<Icon name="arrowLeft" size={16} />}
          >
            Retour
          </Button>
          {inTrash ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void restore(memory.id)}
              iconLeft={<Icon name="restore" size={16} />}
            >
              Restaurer
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => edit(memory.id)}
              iconLeft={<Icon name="edit" size={16} />}
            >
              Modifier
            </Button>
          )}
        </>
      }
    >
      <article className={styles.memory}>
        {inTrash ? (
          <p className={styles.trashBanner}>
            <Icon name="trash" size={16} />
            Cette mémoire est dans la corbeille.
          </p>
        ) : null}

        <p className={styles.text}>{memory.text}</p>

        {tags.length > 0 || dateTags.length > 0 ? (
          <div className={styles.chips}>
            {tags.map((tag) => (
              <TagChip key={tag.id} label={tag.title} color={tag.color} icon="tag" />
            ))}
            {dateTags.map((dateTag) => (
              <TagChip
                key={dateTag.id}
                label={dateTag.label ?? formatLongDate(fromIsoDate(dateTag.date))}
                icon="calendar"
              />
            ))}
          </div>
        ) : null}

        <dl className={styles.meta}>
          <div>
            <dt>Créée le</dt>
            <dd>{formatDateTime(memory.createdAt)}</dd>
          </div>
          {memory.updatedAt.getTime() !== memory.createdAt.getTime() ? (
            <div>
              <dt>Modifiée le</dt>
              <dd>{formatDateTime(memory.updatedAt)}</dd>
            </div>
          ) : null}
          {memory.reviewCount > 0 ? (
            <div>
              <dt>Relue</dt>
              <dd>{memory.reviewCount} fois</dd>
            </div>
          ) : null}
        </dl>

        {!inTrash ? (
          <div className={styles.dangerZone}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void remove(memory.id)}
              iconLeft={<Icon name="trash" size={16} />}
            >
              Supprimer
            </Button>
          </div>
        ) : null}
      </article>

      {related.length > 0 ? (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>Mémoires liées</h2>
          {/* The card carries its own "Ouvrir la mémoire" link, so it must not
              be wrapped in another one: nested anchors are invalid HTML and
              leave keyboard and screen-reader users with an ambiguous target. */}
          <div className={styles.relatedList}>
            {related.map((candidate) => (
              <MemoryCard key={candidate.id} memory={candidate} />
            ))}
          </div>
        </section>
      ) : null}
    </Page>
  );
}
