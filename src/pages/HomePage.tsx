import { subDays, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/paths';
import { pickOnThisDay, pickRandomInWindow } from '@/domain/services/memorySelection';
import { computeStats } from '@/domain/services/stats';
import { MemorySection } from '@/features/home/components/MemorySection';
import { useMemoryActions } from '@/features/memories/hooks/useMemoryActions';
import { useMemoriesStore, useSessionStore, useUiStore } from '@/store';
import { Button, EmptyState, Icon, IconButton, Page, Spinner } from '@/ui';

import styles from './HomePage.module.scss';

const RECENT_COUNT = 3;
const RANDOM_COUNT = 2;
const RECENT_DAYS = 7;
const RECENT_MONTHS = 6;

export function HomePage() {
  const memories = useMemoriesStore((state) => state.active);
  const loaded = useMemoriesStore((state) => state.loaded);
  const status = useSessionStore((state) => state.status);
  const openCapture = useUiStore((state) => state.openCapture);
  const { edit, remove } = useMemoryActions();

  // The random shelves are drawn once and stay put until the user asks for
  // more. Re-drawing on every render would make the page flicker and lose the
  // memory someone was halfway through reading.
  const [seed, setSeed] = useState(0);

  const now = useMemo(() => new Date(), []);
  const stats = useMemo(() => computeStats(memories, now), [memories, now]);

  const recent = useMemo(() => memories.slice(0, RECENT_COUNT), [memories]);

  const onThisDay = useMemo(
    () => pickOnThisDay(memories, now).slice(0, RANDOM_COUNT),
    [memories, now],
  );

  const lastDays = useMemo(
    () =>
      pickRandomInWindow(memories, { from: subDays(now, RECENT_DAYS), to: now }, RANDOM_COUNT, {
        now,
      }),
    // `seed` is what makes the shuffle button redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memories, now, seed],
  );

  const lastMonths = useMemo(
    () =>
      pickRandomInWindow(
        memories,
        { from: subMonths(now, RECENT_MONTHS), to: subDays(now, RECENT_DAYS) },
        RANDOM_COUNT,
        { now },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memories, now, seed],
  );

  if (!loaded && status !== 'ready') {
    return (
      <Page title="Accueil">
        <div className={styles.loading}>
          <Spinner size={24} label="Chargement de vos mémoires" />
        </div>
      </Page>
    );
  }

  if (memories.length === 0) {
    return (
      <Page title="Accueil">
        <EmptyState
          icon={<Icon name="sparkles" size={22} />}
          title="Votre mémoire commence ici"
          description="Notez une anecdote, une idée, une citation. L’essentiel est d’aller vite : vous organiserez plus tard, ou jamais."
          action={
            <Button
              variant="primary"
              onClick={openCapture}
              iconLeft={<Icon name="plus" size={17} />}
            >
              Première mémoire
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page title="Accueil" description="Quelques mémoires à relire.">
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Mémoires</dt>
          <dd>{stats.total}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Cette semaine</dt>
          <dd>{stats.createdThisWeek}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Série en cours</dt>
          <dd>
            {stats.currentStreak} <span className={styles.unit}>j</span>
          </dd>
        </div>
        {stats.untagged > 0 ? (
          <div className={styles.stat}>
            <dt>Sans tag</dt>
            <dd className={styles.warning}>{stats.untagged}</dd>
          </div>
        ) : null}
      </dl>

      <div className={styles.sections}>
        <MemorySection
          title="Il y a un an"
          icon="sparkles"
          description="Ce que vous notiez à la même date les années précédentes."
          memories={onThisDay}
          onEdit={(memory) => edit(memory.id)}
          onDelete={(memory) => void remove(memory.id)}
        />

        <MemorySection
          title="Récentes"
          icon="inbox"
          memories={recent}
          onEdit={(memory) => edit(memory.id)}
          onDelete={(memory) => void remove(memory.id)}
          seeAllTo={ROUTES.memories}
        />

        <MemorySection
          title="Ces derniers jours"
          icon="shuffle"
          description="Tirage aléatoire parmi la semaine écoulée."
          memories={lastDays}
          onEdit={(memory) => edit(memory.id)}
          onDelete={(memory) => void remove(memory.id)}
          action={
            <IconButton
              label="Retirer au hasard"
              icon={<Icon name="shuffle" size={16} />}
              size="sm"
              onClick={() => setSeed((value) => value + 1)}
            />
          }
        />

        <MemorySection
          title="Ces derniers mois"
          icon="layers"
          description="Tirage aléatoire parmi les six derniers mois."
          memories={lastMonths}
          onEdit={(memory) => edit(memory.id)}
          onDelete={(memory) => void remove(memory.id)}
          action={
            <IconButton
              label="Retirer au hasard"
              icon={<Icon name="shuffle" size={16} />}
              size="sm"
              onClick={() => setSeed((value) => value + 1)}
            />
          }
        />
      </div>

      {stats.untagged > 0 ? (
        <aside className={styles.nudge}>
          <Icon name="sparkles" size={18} className={styles.nudgeIcon} />
          <div>
            <p className={styles.nudgeTitle}>
              {stats.untagged} mémoire{stats.untagged > 1 ? 's' : ''} sans tag
            </p>
            <p className={styles.nudgeText}>
              Le mode Relire les fait défiler une par une : quelques secondes pour enrichir ou
              supprimer.
            </p>
          </div>
          <Link to={ROUTES.swipe} className={styles.nudgeAction}>
            <Button variant="secondary" size="sm">
              Relire
            </Button>
          </Link>
        </aside>
      ) : null}
    </Page>
  );
}
