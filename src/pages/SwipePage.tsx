import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DateTag, MemoryId, Tag } from '@/domain/models';
import { isUntagged } from '@/domain/models';
import { orderForReview } from '@/domain/services/memorySelection';
import { useMemoryActions } from '@/features/memories/hooks/useMemoryActions';
import { SwipeCard } from '@/features/swipe/components/SwipeCard';
import { TagPickerPanel } from '@/features/tags/components/TagPickerPanel';
import { useHotkey } from '@/hooks';
import { cn } from '@/lib/cn';
import {
  findOrCreateTag,
  markMemoryReviewed,
  resolveDateTags,
  resolveTags,
  toggleMemoryDateTag,
  toggleMemoryTag,
  useDateTagsStore,
  useMemoriesStore,
  useTagsStore,
  useUiStore,
} from '@/store';
import { Button, EmptyState, Icon, Page, Spinner } from '@/ui';

import styles from './SwipePage.module.scss';

type Scope = 'all' | 'untagged';

export function SwipePage() {
  const memories = useMemoriesStore((state) => state.active);
  const memoriesById = useMemoriesStore((state) => state.byId);
  const loaded = useMemoriesStore((state) => state.loaded);
  const tagsById = useTagsStore((state) => state.byId);
  const dateTagsById = useDateTagsStore((state) => state.byId);
  const openMemoryEditor = useUiStore((state) => state.openMemoryEditor);
  const captureOpen = useUiStore((state) => state.captureOpen);
  const { remove } = useMemoryActions();

  const [scope, setScope] = useState<Scope>('all');
  const [session, setSession] = useState(0);
  const [index, setIndex] = useState(0);
  const [showTags, setShowTags] = useState(false);

  /**
   * The deck order is computed once per session and stored as ids.
   *
   * Recomputing it from `memories` would reshuffle mid-review: passing a card
   * writes `lastReviewedAt`, which changes the weights, which would reorder the
   * queue under the user. Resolving ids from the store on each render keeps the
   * *content* live while the *order* stays put.
   */
  const queue = useMemo(() => {
    const pool = scope === 'untagged' ? memories.filter(isUntagged) : memories;
    return orderForReview(pool).map((memory) => memory.id);
    // Intentionally not reacting to `memories`: see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, session]);

  // A memory deleted elsewhere (or newly tagged in "untagged" mode) drops out.
  const remaining = useMemo(
    () => queue.filter((id) => memoriesById[id] !== undefined),
    [queue, memoriesById],
  );

  const currentId: MemoryId | undefined = remaining[index];
  const current = currentId === undefined ? undefined : memoriesById[currentId];

  const goNext = useCallback(() => {
    if (currentId === undefined) return;

    // Marking reviewed is what makes the weighted draw work over time: it is
    // how a memory earns its way to the back of the queue.
    void markMemoryReviewed(currentId).catch(() => {
      // A failed review counter must not interrupt the flow; it will be
      // recorded next time the memory comes round.
    });

    setShowTags(false);
    setIndex((value) => value + 1);
  }, [currentId]);

  const restart = useCallback(() => {
    setIndex(0);
    setShowTags(false);
    setSession((value) => value + 1);
  }, []);

  // Keyboard-first: the whole point is working through a pile quickly.
  const hotkeysEnabled = !captureOpen && current !== undefined;
  useHotkey('ArrowRight', goNext, { enabled: hotkeysEnabled });
  useHotkey('ArrowLeft', goNext, { enabled: hotkeysEnabled });
  useHotkey('e', () => currentId !== undefined && openMemoryEditor(currentId), {
    enabled: hotkeysEnabled,
  });
  useHotkey('t', () => setShowTags((open) => !open), { enabled: hotkeysEnabled });
  useHotkey(
    'Delete',
    () => {
      if (currentId === undefined) return;
      void remove(currentId);
      goNext();
    },
    { enabled: hotkeysEnabled },
  );

  // Switching scope starts a fresh deck.
  useEffect(() => {
    setIndex(0);
    setSession((value) => value + 1);
  }, [scope]);

  if (!loaded) {
    return (
      <Page title="Relire">
        <div className={styles.loading}>
          <Spinner size={24} label="Chargement" />
        </div>
      </Page>
    );
  }

  const tags: Tag[] = current === undefined ? [] : resolveTags(current.tagIds, tagsById);
  const dateTags: DateTag[] =
    current === undefined ? [] : resolveDateTags(current.dateTagIds, dateTagsById);

  return (
    <Page
      title="Relire"
      description="Une mémoire au hasard, en commençant par celles que vous avez le moins revues."
      actions={
        <fieldset className={styles.scopeToggle}>
          <legend className={styles.srOnly}>Quoi relire</legend>
          {(
            [
              { value: 'all', label: 'Tout' },
              { value: 'untagged', label: 'Sans tag' },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(styles.scopeButton, scope === option.value && styles.scopeActive)}
            >
              <input
                type="radio"
                name="swipe-scope"
                value={option.value}
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
                className={styles.srOnly}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      }
    >
      {current === undefined ? (
        <EmptyState
          icon={<Icon name="check" size={22} />}
          title={remaining.length === 0 ? 'Rien à relire' : 'Vous avez tout parcouru'}
          description={
            remaining.length === 0
              ? scope === 'untagged'
                ? 'Toutes vos mémoires portent au moins un tag. Beau travail.'
                : 'Notez une première mémoire pour commencer à relire.'
              : 'Relancez un tour : l’ordre change à chaque session.'
          }
          action={
            remaining.length > 0 ? (
              <Button
                variant="primary"
                onClick={restart}
                iconLeft={<Icon name="shuffle" size={17} />}
              >
                Recommencer
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={styles.deck}>
          <p className={styles.progress}>
            {index + 1} / {remaining.length}
          </p>

          <div className={styles.cardArea}>
            {/* `popLayout`, not `wait`: the outgoing card flies out while the
                next one is already in place, which is what a deck should feel
                like. `wait` would also make advancing depend on the exit
                animation completing — a needless single point of failure. */}
            <AnimatePresence mode="popLayout">
              <SwipeCard
                key={current.id}
                memory={current}
                tags={tags}
                dateTags={dateTags}
                onDismiss={goNext}
                onRemoveTag={(tag) => void toggleMemoryTag(current.id, tag.id)}
                onRemoveDateTag={(dateTag) => void toggleMemoryDateTag(current.id, dateTag.id)}
              />
            </AnimatePresence>
          </div>

          {showTags ? (
            <TagPickerPanel
              selectedIds={current.tagIds}
              onToggle={(tag) => void toggleMemoryTag(current.id, tag.id)}
              onCreate={(title) => {
                void findOrCreateTag(title).then((tag) => toggleMemoryTag(current.id, tag.id));
              }}
            />
          ) : null}

          <div className={styles.actions}>
            <Button
              variant="ghost"
              onClick={() => void remove(current.id).then(goNext)}
              iconLeft={<Icon name="trash" size={17} />}
            >
              Supprimer
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowTags((open) => !open)}
              iconLeft={<Icon name="tag" size={17} />}
            >
              Tags
            </Button>

            <Button
              variant="secondary"
              onClick={() => openMemoryEditor(current.id)}
              iconLeft={<Icon name="edit" size={17} />}
            >
              Modifier
            </Button>

            <Button
              variant="primary"
              onClick={goNext}
              iconRight={<Icon name="chevronRight" size={17} />}
            >
              Suivante
            </Button>
          </div>

          <p className={styles.shortcuts}>
            <kbd>←</kbd> <kbd>→</kbd> passer · <kbd>E</kbd> modifier · <kbd>T</kbd> tags ·{' '}
            <kbd>Suppr</kbd> supprimer
          </p>
        </div>
      )}
    </Page>
  );
}
